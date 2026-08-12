import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { env } from '../config/env.js';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

// Runs once, ever, per database volume: only inserts a row if the `pin`
// table is empty. On every subsequent boot this is a no-op, so changing
// PARENT_INITIAL_PIN in .env later has no effect once a real PIN exists.
export function ensureSeeded() {
  const existing = db.prepare('SELECT id FROM pin WHERE id = 1').get();
  if (existing) return;

  const pinHash = bcrypt.hashSync(env.parentInitialPin, 10);
  db.prepare(
    `INSERT INTO pin (id, pin_hash, must_change, failed_attempts, updated_at)
     VALUES (1, ?, 1, 0, ?)`
  ).run(pinHash, Date.now());
}

function getRow() {
  return db.prepare('SELECT * FROM pin WHERE id = 1').get();
}

export function isLockedOut() {
  const row = getRow();
  return Boolean(row.locked_until && row.locked_until > Date.now());
}

export function verifyPin(candidate) {
  const row = getRow();
  if (row.locked_until && row.locked_until > Date.now()) {
    return { ok: false, lockedOut: true };
  }

  const ok = bcrypt.compareSync(candidate, row.pin_hash);
  if (ok) {
    db.prepare(
      'UPDATE pin SET failed_attempts = 0, locked_until = NULL WHERE id = 1'
    ).run();
    return { ok: true, mustChange: Boolean(row.must_change) };
  }

  const failedAttempts = row.failed_attempts + 1;
  const lockedUntil = failedAttempts >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : null;
  db.prepare(
    'UPDATE pin SET failed_attempts = ?, locked_until = ? WHERE id = 1'
  ).run(failedAttempts, lockedUntil);
  return { ok: false, lockedOut: Boolean(lockedUntil) };
}

export function changePin(currentPin, newPin) {
  const result = verifyPin(currentPin);
  if (!result.ok) return result;

  const pinHash = bcrypt.hashSync(newPin, 10);
  db.prepare(
    'UPDATE pin SET pin_hash = ?, must_change = 0, updated_at = ? WHERE id = 1'
  ).run(pinHash, Date.now());
  return { ok: true };
}

export function mustChangePin() {
  return Boolean(getRow().must_change);
}
