import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

export function useAuth() {
  const [status, setStatus] = useState({ loading: true, authenticated: false, mustChangePin: false });

  const refresh = useCallback(async () => {
    const data = await api.get('/auth/status');
    setStatus({ loading: false, ...data });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (pin) => {
      const data = await api.post('/auth/login', { pin });
      setStatus({ loading: false, ...data });
      return data;
    },
    []
  );

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setStatus({ loading: false, authenticated: false, mustChangePin: false });
  }, []);

  const changePin = useCallback(
    async (currentPin, newPin) => {
      await api.post('/auth/change-pin', { currentPin, newPin });
      await refresh();
    },
    [refresh]
  );

  return { ...status, login, logout, changePin, refresh };
}
