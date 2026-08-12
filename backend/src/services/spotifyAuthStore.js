import { db } from '../db/index.js';

export function getAuth() {
  return db.prepare('SELECT * FROM spotify_auth WHERE id = 1').get();
}

export function isConnected() {
  const row = getAuth();
  return Boolean(row?.refresh_token);
}

export function saveTokens({ refreshToken, accessToken, expiresAt, spotifyUserId, scope }) {
  db.prepare(
    `INSERT INTO spotify_auth (id, refresh_token, access_token, access_token_expires_at, spotify_user_id, scope, connected_at)
     VALUES (1, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       refresh_token = excluded.refresh_token,
       access_token = excluded.access_token,
       access_token_expires_at = excluded.access_token_expires_at,
       spotify_user_id = excluded.spotify_user_id,
       scope = excluded.scope,
       connected_at = COALESCE(spotify_auth.connected_at, excluded.connected_at)`
  ).run(refreshToken, accessToken, expiresAt, spotifyUserId ?? null, scope ?? null, Date.now());
}

export function saveAccessToken({ accessToken, expiresAt }) {
  db.prepare(
    'UPDATE spotify_auth SET access_token = ?, access_token_expires_at = ? WHERE id = 1'
  ).run(accessToken, expiresAt);
}

export function clearAuth() {
  db.prepare('DELETE FROM spotify_auth WHERE id = 1').run();
}
