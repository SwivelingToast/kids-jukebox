import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

export default function SpotifyConnect() {
  const [status, setStatus] = useState({ loading: true, connected: false });

  const reload = async () => {
    const data = await api.get('/spotify/status');
    setStatus({ loading: false, ...data });
  };

  useEffect(() => {
    reload();
  }, []);

  const disconnect = async () => {
    await api.post('/spotify/disconnect');
    reload();
  };

  if (status.loading) return <p>Loading…</p>;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-violet-950">Spotify Account</h2>
      {status.connected ? (
        <>
          <p className="text-violet-700">
            Connected as <span className="font-semibold">{status.spotifyUserId}</span>
          </p>
          <button
            onClick={disconnect}
            className="w-fit rounded-lg bg-red-100 px-4 py-2 font-semibold text-red-700"
          >
            Disconnect
          </button>
        </>
      ) : (
        <>
          <p className="text-violet-700">Not connected yet. Requires a Spotify Premium account.</p>
          <a
            href="/api/spotify/connect"
            className="w-fit rounded-lg bg-green-600 px-4 py-2 font-semibold text-white"
          >
            Connect Spotify
          </a>
        </>
      )}
    </div>
  );
}
