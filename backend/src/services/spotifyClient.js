import { env } from '../config/env.js';
import { getAuth, saveTokens, saveAccessToken } from './spotifyAuthStore.js';

const ACCOUNTS_BASE = 'https://accounts.spotify.com';
const API_BASE = 'https://api.spotify.com/v1';
const TOKEN_SAFETY_MARGIN_MS = 60 * 1000;

function basicAuthHeader() {
  const creds = Buffer.from(`${env.spotifyClientId}:${env.spotifyClientSecret}`).toString('base64');
  return `Basic ${creds}`;
}

export function getAuthorizeUrl(state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.spotifyClientId,
    scope: 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state',
    redirect_uri: env.spotifyRedirectUri,
    state,
  });
  return `${ACCOUNTS_BASE}/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code) {
  const res = await fetch(`${ACCOUNTS_BASE}/api/token`, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.spotifyRedirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Spotify token exchange failed: ${res.status}`);
  const data = await res.json();

  const meRes = await fetch(`${API_BASE}/me`, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const me = meRes.ok ? await meRes.json() : {};

  saveTokens({
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    spotifyUserId: me.id,
    scope: data.scope,
  });
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch(`${ACCOUNTS_BASE}/api/token`, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Spotify token refresh failed: ${res.status}`);
  const data = await res.json();
  const expiresAt = Date.now() + data.expires_in * 1000;
  saveAccessToken({ accessToken: data.access_token, expiresAt });
  return { accessToken: data.access_token, expiresAt };
}

export async function getValidAccessToken() {
  const auth = getAuth();
  if (!auth?.refresh_token) {
    const err = new Error('Spotify not connected');
    err.status = 409;
    err.publicMessage = 'Spotify is not connected yet';
    throw err;
  }

  if (auth.access_token && auth.access_token_expires_at > Date.now() + TOKEN_SAFETY_MARGIN_MS) {
    return { accessToken: auth.access_token, expiresAt: auth.access_token_expires_at };
  }

  return refreshAccessToken(auth.refresh_token);
}

export async function spotifyApiFetch(pathname, options = {}) {
  const { accessToken } = await getValidAccessToken();
  const res = await fetch(`${API_BASE}${pathname}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`Spotify API ${pathname} failed: ${res.status} ${body}`);
    err.status = res.status === 429 ? 429 : 502;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}
