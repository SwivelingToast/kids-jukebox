import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

export default function PlaylistManager({ onLibraryChanged }) {
  const [playlists, setPlaylists] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const reload = async () => {
    setPlaylists(await api.get('/playlists'));
  };

  useEffect(() => {
    reload();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/playlists', { spotifyPlaylistUrlOrId: input });
      setInput('');
      await reload();
      onLibraryChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResync = async (id) => {
    await api.post(`/playlists/${id}/resync`);
    await reload();
    onLibraryChanged?.();
  };

  const handleDelete = async (id) => {
    await api.delete(`/playlists/${id}`);
    await reload();
    onLibraryChanged?.();
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-violet-950">Linked Playlists</h2>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a Spotify playlist link"
          className="flex-1 rounded-lg border-2 border-violet-200 px-3 py-2"
        />
        <button
          type="submit"
          disabled={submitting || !input.trim()}
          className="rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Adding…' : 'Add'}
        </button>
      </form>
      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

      <ul className="flex flex-col gap-2">
        {playlists.map((playlist) => (
          <li
            key={playlist.id}
            className="flex items-center gap-3 rounded-lg border border-violet-100 p-3"
          >
            {playlist.imageUrl ? (
              <img src={playlist.imageUrl} alt="" className="h-12 w-12 rounded object-cover" />
            ) : (
              <div className="h-12 w-12 rounded bg-violet-200" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-violet-950">{playlist.name}</p>
              <p className="text-sm text-violet-500">{playlist.trackCount} songs</p>
            </div>
            <button
              onClick={() => handleResync(playlist.id)}
              className="rounded bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700"
            >
              Resync
            </button>
            <button
              onClick={() => handleDelete(playlist.id)}
              className="rounded bg-red-100 px-3 py-1 text-sm font-semibold text-red-700"
            >
              Remove
            </button>
          </li>
        ))}
        {playlists.length === 0 ? (
          <p className="text-violet-500">No playlists linked yet.</p>
        ) : null}
      </ul>
    </div>
  );
}
