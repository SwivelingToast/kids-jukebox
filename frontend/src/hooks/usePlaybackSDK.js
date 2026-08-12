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
  const playerRef = useRef(null);
  const lastKnownRef = useRef(null); // { uri, position }
  const onTrackEndRef = useRef(onTrackEnd);
  onTrackEndRef.current = onTrackEnd;

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
        if (!state) return;
        const current = { uri: state.track_window.current_track?.uri, position: state.position };
        const prev = lastKnownRef.current;

        const looksLikeTrackEnd =
          prev &&
          prev.uri === current.uri &&
          prev.position > 0 &&
          state.paused &&
          state.position === 0;

        if (looksLikeTrackEnd) {
          onTrackEndRef.current?.();
        }

        lastKnownRef.current = current;
      });

      player.connect();
    };

    return () => {
      playerRef.current?.disconnect();
    };
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

    // Reclaim the device before every play call rather than trying to
    // detect whether something else took it over in the meantime.
    const transferRes = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_ids: [id], play: false }),
    });
    if (!transferRes.ok) {
      const body = await transferRes.text().catch(() => '');
      const message = `Failed to transfer playback to this device: ${transferRes.status} ${body}`;
      console.error(message);
      setError(message);
      return false;
    }

    const playRes = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: [uri] }),
    });
    if (!playRes.ok) {
      const body = await playRes.text().catch(() => '');
      const message = `Failed to start playback: ${playRes.status} ${body}`;
      console.error(message);
      setError(message);
      return false;
    }

    setError(null);
    return true;
  }

  return { ready, deviceId, reconnecting, error, playTrackUri };
}
