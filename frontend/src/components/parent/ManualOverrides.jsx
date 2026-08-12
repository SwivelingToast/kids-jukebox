import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

export default function ManualOverrides({ onLibraryChanged }) {
  const [overrides, setOverrides] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const reloadOverrides = async () => {
    setOverrides(await api.get('/library/overrides'));
  };

  useEffect(() => {
    reloadOverrides();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      setResults(await api.get(`/catalog/search?q=${encodeURIComponent(query)}`));
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const addTrack = async (track) => {
    await api.post('/library/overrides', { action: 'add', trackUri: track.uri, trackMetadata: track });
    await reloadOverrides();
    onLibraryChanged?.();
  };

  const removeTrack = async (track) => {
    await api.post('/library/overrides', { action: 'remove', trackUri: track.uri, trackMetadata: track });
    await reloadOverrides();
    onLibraryChanged?.();
  };

  const revertOverride = async (uri) => {
    await api.delete(`/library/overrides/${encodeURIComponent(uri)}`);
    await reloadOverrides();
    onLibraryChanged?.();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-violet-950">Add a Specific Song</h2>
        <form onSubmit={handleSearch} className="mt-2 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Spotify for a song"
            className="flex-1 rounded-lg border-2 border-violet-200 px-3 py-2"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            Search
          </button>
        </form>
        {searchError ? <p className="mt-2 text-sm font-semibold text-red-600">{searchError}</p> : null}

        <ul className="mt-3 flex flex-col gap-2">
          {results.map((track) => (
            <li key={track.uri} className="flex items-center gap-3 rounded-lg border border-violet-100 p-2">
              {track.albumArtUrl ? (
                <img src={track.albumArtUrl} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <div className="h-10 w-10 rounded bg-violet-200" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-violet-950">{track.name}</p>
                <p className="truncate text-sm text-violet-500">{track.artists.join(', ')}</p>
              </div>
              <button
                onClick={() => addTrack(track)}
                className="rounded bg-green-100 px-3 py-1 text-sm font-semibold text-green-700"
              >
                Approve
              </button>
              <button
                onClick={() => removeTrack(track)}
                className="rounded bg-red-100 px-3 py-1 text-sm font-semibold text-red-700"
              >
                Block
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-bold text-violet-950">Manual Overrides</h2>
        <p className="text-sm text-violet-500">
          These take priority over your linked playlists.
        </p>
        <ul className="mt-2 flex flex-col gap-2">
          {overrides.map((o) => (
            <li key={o.uri} className="flex items-center gap-3 rounded-lg border border-violet-100 p-2">
              {o.albumArtUrl ? (
                <img src={o.albumArtUrl} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <div className="h-10 w-10 rounded bg-violet-200" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-violet-950">{o.name}</p>
                <p className="truncate text-sm text-violet-500">{o.artists.join(', ')}</p>
              </div>
              <span
                className={`rounded px-2 py-1 text-xs font-bold uppercase ${
                  o.action === 'add' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {o.action === 'add' ? 'Approved' : 'Blocked'}
              </span>
              <button
                onClick={() => revertOverride(o.uri)}
                className="rounded bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700"
              >
                Revert
              </button>
            </li>
          ))}
          {overrides.length === 0 ? (
            <p className="text-violet-500">No manual overrides yet.</p>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
