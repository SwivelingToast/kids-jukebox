import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { spotifyApiFetch } from '../services/spotifyClient.js';

export const catalogRouter = Router();

catalogRouter.get('/search', requireAuth, async (req, res, next) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (!q) return res.json([]);

    const params = new URLSearchParams({ q, type: 'track', limit: '20' });
    const data = await spotifyApiFetch(`/search?${params.toString()}`);
    const tracks = (data.tracks?.items ?? []).map((track) => ({
      uri: track.uri,
      spotifyTrackId: track.id,
      name: track.name,
      artists: track.artists.map((a) => a.name),
      albumName: track.album?.name ?? null,
      albumArtUrl: track.album?.images?.[0]?.url ?? null,
      durationMs: track.duration_ms ?? null,
    }));
    res.json(tracks);
  } catch (err) {
    next(err);
  }
});
