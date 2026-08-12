import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getApprovedLibrary, getOverrides, setOverride, removeOverride } from '../services/approvedList.js';

export const libraryRouter = Router();

libraryRouter.get('/', (req, res) => {
  res.json(getApprovedLibrary());
});

libraryRouter.get('/overrides', requireAuth, (req, res) => {
  res.json(getOverrides());
});

libraryRouter.post('/overrides', requireAuth, (req, res) => {
  const { action, trackUri, trackMetadata } = req.body;
  if (action !== 'add' && action !== 'remove') {
    return res.status(400).json({ error: "action must be 'add' or 'remove'" });
  }
  if (typeof trackUri !== 'string' || !trackUri) {
    return res.status(400).json({ error: 'trackUri is required' });
  }
  if (action === 'add' && !trackMetadata) {
    return res.status(400).json({ error: 'trackMetadata is required when adding a new track' });
  }
  setOverride(action, trackUri, trackMetadata);
  res.json({ ok: true });
});

libraryRouter.delete('/overrides/:uri', requireAuth, (req, res) => {
  removeOverride(decodeURIComponent(req.params.uri));
  res.json({ ok: true });
});
