import { useEffect, useRef, useState } from 'react';
import { getAccessToken } from '../api/spotifyToken.js';
import { api } from '../api/client.js';

// A freshly-registered Spotify Connect device can briefly 500 on the
// public /me/player endpoints right after connecting, even though the
// device is already working at the SDK/websocket level - retry transient
// server errors a couple of times before giving up.
async function fetchSpotifyWithRetry(url, options, retries = 2, delayMs = 600) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, options);
    if (res.ok || res.status < 500 || attempt >= retries) {
      return res;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

function loadSdkScript() {
  if (document.getElementById('spotify-player-sdk')) return;
  const script = document.createElement('script');
  script.id = 'spotify-player-sdk';
  script.src = 'https://sdk.scdn.co/spotify-player.js';
  script.async = true;
  document.body.appendChild(script);
}

// Wraps Spotify's Web Playback SDK: registers this tab as a Connect device,
// and exposes a single playTrackUri() that always reclaims the device
// before playing (another Connect device on the same account - a phone, a
// speaker - may have grabbed the active slot since we last played).
export function usePlaybackSDK({ onTrackEnd }) {
  const [ready, setReady] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0-1, informational only
  const progressRef = useRef({ position: 0, duration: 0, updatedAt: Date.now(), paused: true });
  const playerRef = useRef(null);
  const lastKnownRef = useRef(null); // { uri, position }
  const onTrackEndRef = useRef(onTrackEnd);
  onTrackEndRef.current = onTrackEnd;
  // True while we're actively issuing our own transfer+play sequence. The
  // transfer call alone triggers a player_state_changed event reporting the
  // *previous* track as paused at position 0 - which otherwise looks
  // identical to that track having ended naturally, spuriously firing
  // onTrackEnd a second time and racing with the play we're already doing.
  const isTransitioningRef = useRef(false);
  const transitionTimeoutRef = useRef(null);

  function clearTransitioning() {
    isTransitioningRef.current = false;
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    loadSdkScript();

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'Kids Jukebox',
        getOAuthToken: (cb) => getAccessToken().then(cb),
        volume: 0.8,
      });
      playerRef.current = player;

      player.addListener('ready', ({ device_id }) => {
        setDeviceId(device_id);
        setReady(true);
        setReconnecting(false);
        api.post('/spotify/device', { deviceId: device_id }).catch(() => {});
      });

      player.addListener('not_ready', () => {
        setReconnecting(true);
      });

      // Without these, failures here (non-Premium account, no DRM/EME
      // support in the browser, expired token, etc.) are otherwise
      // completely silent - no audio, no error, no clue why.
      player.addListener('initialization_error', ({ message }) => {
        console.error('Spotify SDK initialization_error:', message);
        setError(`Player failed to initialize: ${message}`);
      });
      player.addListener('authentication_error', ({ message }) => {
        console.error('Spotify SDK authentication_error:', message);
        setError(`Spotify authentication failed: ${message}`);
      });
      player.addListener('account_error', ({ message }) => {
        console.error('Spotify SDK account_error:', message);
        setError(`Spotify account error (Premium required): ${message}`);
      });
      player.addListener('playback_error', ({ message }) => {
        console.error('Spotify SDK playback_error:', message);
        setError(`Playback error: ${message}`);
      });

      player.addListener('player_state_changed', (state) => {
        if (!state) {
          setIsPlaying(false);
          progressRef.current = { position: 0, duration: 0, updatedAt: Date.now(), paused: true };
          return;
        }
        setIsPlaying(!state.paused);
        progressRef.current = {
          position: state.position,
          duration: state.duration,
          updatedAt: Date.now(),
          paused: state.paused,
        };

        const current = { uri: state.track_window.current_track?.uri, position: state.position };
        const prev = lastKnownRef.current;

        const looksLikeTrackEnd =
          !isTransitioningRef.current &&
          prev &&
          prev.uri === current.uri &&
          prev.position > 0 &&
          state.paused &&
          state.position === 0;

        if (looksLikeTrackEnd) {
          onTrackEndRef.current?.();
        }

        // Once the new track is confirmed actually playing, our own
        // transfer/play sequence is done and end-detection can resume.
        if (isTransitioningRef.current && !state.paused) {
          clearTransitioning();
        }

        lastKnownRef.current = current;
      });

      player.connect();
    };

    return () => {
      playerRef.current?.disconnect();
    };
  }, []);

  // The SDK only fires player_state_changed on actual state transitions
  // (play/pause/seek/track change), not continuously - so interpolate a
  // smooth, informational-only progress fraction between those events
  // based on elapsed wall-clock time.
  useEffect(() => {
    function tick() {
      const { position, duration, updatedAt, paused } = progressRef.current;
      if (!duration) {
        setProgress(0);
        return;
      }
      const elapsed = paused ? 0 : Date.now() - updatedAt;
      const current = Math.min(position + elapsed, duration);
      setProgress(current / duration);
    }
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, []);

  async function playTrackUri(uri) {
    const id = deviceId;
    if (!id) {
      const message = 'No Spotify Connect device yet - the player has not finished initializing.';
      console.error(message);
      setError(message);
      return false;
    }
    const accessToken = await getAccessToken();

    // Reset immediately rather than waiting for the SDK's next
    // player_state_changed event, which lags behind this call by up to a
    // couple seconds and would otherwise keep showing the previous
    // track's stale position/progress in the meantime.
    progressRef.current = { position: 0, duration: 0, updatedAt: Date.now(), paused: true };
    setProgress(0);

    isTransitioningRef.current = true;
    // Safety net: if we never see a confirming "playing" state (e.g. a
    // network hiccup), don't leave end-detection suppressed forever.
    transitionTimeoutRef.current = setTimeout(clearTransitioning, 5000);

    // The play endpoint below already transfers playback to whatever
    // device_id is passed (reclaiming it from another Connect device on
    // the same account if needed) as part of the same call - a separate
    // PUT /me/player transfer call is not required, and that endpoint has
    // been observed to consistently 500 on some accounts/devices, so it's
    // skipped entirely rather than routed through.
    const playRes = await fetchSpotifyWithRetry(
      `https://api.spotify.com/v1/me/player/play?device_id=${id}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: [uri] }),
      }
    );
    if (!playRes.ok) {
      const body = await playRes.text().catch(() => '');
      const message = `Failed to start playback: ${playRes.status} ${body}`;
      console.error(message);
      setError(message);
      clearTransitioning();
      return false;
    }

    setError(null);
    return true;
  }

  async function setPaused(paused) {
    const id = deviceId;
    if (!id) return false;
    const accessToken = await getAccessToken();

    const res = await fetchSpotifyWithRetry(
      `https://api.spotify.com/v1/me/player/${paused ? 'pause' : 'play'}?device_id=${id}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const message = `Failed to ${paused ? 'pause' : 'resume'} playback: ${res.status} ${body}`;
      console.error(message);
      setError(message);
      return false;
    }
    setError(null);
    setIsPlaying(!paused);
    return true;
  }

  // Explicitly stop the device rather than leaving whatever was last
  // playing running orphaned when there's nothing left queued.
  const pausePlayback = () => setPaused(true);
  const togglePlayback = () => setPaused(isPlaying);

  return {
    ready,
    deviceId,
    reconnecting,
    error,
    isPlaying,
    progress,
    playTrackUri,
    pausePlayback,
    togglePlayback,
  };
}
