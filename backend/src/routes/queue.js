import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { isApproved } from '../services/approvedList.js';
import * as queueService from '../services/queueService.js';

export const queueRouter = Router();

queueRouter.get('/', (req, res) => {
  res.json(queueService.getQueueState());
});

queueRouter.post('/', (req, res) => {
  const { trackUri } = req.body;
  if (typeof trackUri !== 'string' || !trackUri) {
    return res.status(400).json({ error: 'trackUri is required' });
  }
  if (!isApproved(trackUri)) {
    return res.status(403).json({ error: 'That song is not on the approved list' });
  }
  const state = queueService.enqueue(trackUri, 'kid');
  res.status(201).json(state);
});

queueRouter.post('/advance', (req, res) => {
  res.json(queueService.advance());
});

queueRouter.post('/skip', (req, res) => {
  res.json(queueService.advance());
});

queueRouter.patch('/playback', (req, res) => {
  const { isPlaying } = req.body;
  queueService.setPlaybackFlag(Boolean(isPlaying));
  res.json(queueService.getQueueState());
});

queueRouter.delete('/:id', requireAuth, (req, res) => {
  res.json(queueService.removeItem(Number(req.params.id)));
});

queueRouter.patch('/reorder', requireAuth, (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'orderedIds must be an array' });
  }
  res.json(queueService.reorder(orderedIds.map(Number)));
});

queueRouter.post('/clear', requireAuth, (req, res) => {
  res.json(queueService.clear());
});
