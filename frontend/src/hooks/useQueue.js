import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';

const POLL_MS = 2500;

export function useQueue() {
  const [state, setState] = useState({ nowPlaying: null, isPlaying: false, queue: [] });
  const timerRef = useRef(null);

  const reload = useCallback(async () => {
    const data = await api.get('/queue');
    setState(data);
    return data;
  }, []);

  useEffect(() => {
    reload();
    timerRef.current = setInterval(reload, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [reload]);

  const enqueue = useCallback(
    async (trackUri) => {
      const data = await api.post('/queue', { trackUri });
      setState(data);
      return data;
    },
    []
  );

  const advance = useCallback(async () => {
    const data = await api.post('/queue/advance');
    setState(data);
    return data;
  }, []);

  const skip = useCallback(async () => {
    const data = await api.post('/queue/skip');
    setState(data);
    return data;
  }, []);

  const removeItem = useCallback(async (id) => {
    const data = await api.delete(`/queue/${id}`);
    setState(data);
    return data;
  }, []);

  const reorder = useCallback(async (orderedIds) => {
    const data = await api.patch('/queue/reorder', { orderedIds });
    setState(data);
    return data;
  }, []);

  const clear = useCallback(async () => {
    const data = await api.post('/queue/clear');
    setState(data);
    return data;
  }, []);

  const reportPlayback = useCallback(async (isPlaying) => {
    await api.patch('/queue/playback', { isPlaying });
  }, []);

  return { ...state, reload, enqueue, advance, skip, removeItem, reorder, clear, reportPlayback };
}
