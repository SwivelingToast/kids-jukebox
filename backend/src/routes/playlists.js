import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { linkPlaylist, resyncPlaylist, listPlaylists, deletePlaylist } from '../services/playlistSync.js';

export const playlistsRouter = Router();

playlistsRouter.get('/', (req, res) => {
  res.json(listPlaylists());
});

playlistsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const { spotifyPlaylistUrlOrId } = req.body;
    if (typeof spotifyPlaylistUrlOrId !== 'string' || !spotifyPlaylistUrlOrId.trim()) {
      return res.status(400).json({ error: 'spotifyPlaylistUrlOrId is required' });
    }
    const summary = await linkPlaylist(spotifyPlaylistUrlOrId);
    res.status(201).json(summary);
  } catch (err) {
    next(err);
  }
});

playlistsRouter.post('/:id/resync', requireAuth, async (req, res, next) => {
  try {
    const summary = await resyncPlaylist(Number(req.params.id));
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

playlistsRouter.delete('/:id', requireAuth, (req, res) => {
  deletePlaylist(Number(req.params.id));
  res.json({ ok: true });
});
