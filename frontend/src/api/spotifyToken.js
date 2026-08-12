import { api } from './client.js';

// Cached briefly to avoid hammering /api/spotify/token when the SDK and the
// play/transfer calls both need a token within the same second.
let cached = null;

export async function getAccessToken() {
  if (cached && cached.expiresAt > Date.now() + 10_000) {
    return cached.accessToken;
  }
  const data = await api.get('/spotify/token');
  cached = { accessToken: data.accessToken, expiresAt: Date.now() + data.expiresIn * 1000 };
  return cached.accessToken;
}
