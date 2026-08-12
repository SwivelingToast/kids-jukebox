import { Router } from 'express';
import crypto from 'node:crypto';
import { requireAuth } from '../middleware/requireAuth.js';
import { getAuthorizeUrl, exchangeCodeForTokens, getValidAccessToken } from '../services/spotifyClient.js';
import { getAuth, isConnected, clearAuth } from '../services/spotifyAuthStore.js';
import { db } from '../db/index.js';

export const spotifyRouter = Router();

spotifyRouter.get('/connect', requireAuth, (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.spotifyOAuthState = state;
  res.redirect(getAuthorizeUrl(state));
});

spotifyRouter.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const expectedState = req.session.spotifyOAuthState;
  req.session.spotifyOAuthState = null;

  if (error || !code || !state || state !== expectedState) {
    return res.redirect('/parent?spotifyError=1');
  }

  try {
    await exchangeCodeForTokens(code);
    res.redirect('/parent?spotifyConnected=1');
  } catch (err) {
    console.error(err);
    res.redirect('/parent?spotifyError=1');
  }
});

spotifyRouter.get('/status', (req, res) => {
  const auth = getAuth();
  res.json({
    connected: isConnected(),
    spotifyUserId: auth?.spotify_user_id ?? null,
    scope: auth?.scope ?? null,
  });
});

spotifyRouter.post('/disconnect', requireAuth, (req, res) => {
  clearAuth();
  res.json({ ok: true });
});

spotifyRouter.get('/token', async (req, res, next) => {
  try {
    const { accessToken, expiresAt } = await getValidAccessToken();
    res.json({ accessToken, expiresIn: Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)) });
  } catch (err) {
    next(err);
  }
});

spotifyRouter.post('/device', (req, res) => {
  const { deviceId } = req.body;
  if (typeof deviceId !== 'string' || !deviceId) {
    return res.status(400).json({ error: 'deviceId is required' });
  }
  db.prepare('UPDATE playback_state SET device_id = ?, updated_at = ? WHERE id = 1').run(
    deviceId,
    Date.now()
  );
  res.json({ ok: true });
});
