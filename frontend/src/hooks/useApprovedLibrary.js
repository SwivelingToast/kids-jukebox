import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

export function useApprovedLibrary() {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const reload = async () => {
    setLoading(true);
    const data = await api.get('/library');
    setLibrary(data);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return library;
    return library.filter(
      (track) =>
        track.name.toLowerCase().includes(q) ||
        track.artists.some((artist) => artist.toLowerCase().includes(q))
    );
  }, [library, query]);

  return { library, filtered, loading, query, setQuery, reload };
}
