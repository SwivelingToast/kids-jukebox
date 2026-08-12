import { Router } from 'express';
import { verifyPin, changePin, isLockedOut } from '../services/pinService.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const authRouter = Router();

authRouter.get('/status', (req, res) => {
  res.json({
    authenticated: Boolean(req.session?.authenticated),
    mustChangePin: Boolean(req.session?.mustChangePin),
  });
});

authRouter.post('/login', (req, res) => {
  const { pin } = req.body;
  if (typeof pin !== 'string') {
    return res.status(400).json({ error: 'PIN is required' });
  }

  if (isLockedOut()) {
    return res.status(429).json({ error: 'Too many failed attempts. Try again later.' });
  }

  const result = verifyPin(pin);
  if (!result.ok) {
    if (result.lockedOut) {
      return res.status(429).json({ error: 'Too many failed attempts. Try again later.' });
    }
    return res.status(401).json({ error: 'Incorrect PIN' });
  }

  req.session.authenticated = true;
  req.session.mustChangePin = result.mustChange;
  res.json({ authenticated: true, mustChangePin: result.mustChange });
});

authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ authenticated: false });
  });
});

authRouter.post('/change-pin', requireAuth, (req, res) => {
  const { currentPin, newPin } = req.body;
  if (typeof currentPin !== 'string' || typeof newPin !== 'string') {
    return res.status(400).json({ error: 'currentPin and newPin are required' });
  }
  if (!/^\d{4,}$/.test(newPin)) {
    return res.status(400).json({ error: 'New PIN must be at least 4 digits' });
  }

  const result = changePin(currentPin, newPin);
  if (!result.ok) {
    return res.status(401).json({ error: 'Current PIN is incorrect' });
  }

  req.session.mustChangePin = false;
  res.json({ ok: true });
});
