import { useEffect, useRef, useState } from 'react';
import { getAccessToken } from '../api/spotifyToken.js';
import { api } from '../api/client.js';

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
  const [positionMs, setPositionMs] = useState(0); // informational only
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

        // TEMP DEBUG: remove once the "frozen counter" issue is diagnosed
        console.log('[playback] player_state_changed', {
          uri: state.track_window.current_track?.uri,
          name: state.track_window.current_track?.name,
          position: state.position,
          duration: state.duration,
          paused: state.paused,
          at: new Date().toISOString(),
        });

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
        setPositionMs(0);
        return;
      }
      const elapsed = paused ? 0 : Date.now() - updatedAt;
      const current = Math.min(position + elapsed, duration);
      setProgress(current / duration);
      setPositionMs(current);
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

    // TEMP DEBUG: remove once the "frozen counter" issue is diagnosed
    console.log('[playback] playTrackUri called', { uri, deviceId: id, at: new Date().toISOString() });

    isTransitioningRef.current = true;
    // Safety net: if we never see a confirming "playing" state (e.g. a
    // network hiccup), don't leave end-detection suppressed forever.
    transitionTimeoutRef.current = setTimeout(clearTransitioning, 5000);

    // Reclaim the device before every play call rather than trying to
    // detect whether something else took it over in the meantime.
    const transferRes = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_ids: [id], play: false }),
    });
    console.log('[playback] transfer response', transferRes.status);
    if (!transferRes.ok) {
      const body = await transferRes.text().catch(() => '');
      const message = `Failed to transfer playback to this device: ${transferRes.status} ${body}`;
      console.error(message);
      setError(message);
      clearTransitioning();
      return false;
    }

    const playRes = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: [uri] }),
    });
    console.log('[playback] play response', playRes.status);
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

    const res = await fetch(
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
    positionMs,
    playTrackUri,
    pausePlayback,
    togglePlayback,
  };
}
