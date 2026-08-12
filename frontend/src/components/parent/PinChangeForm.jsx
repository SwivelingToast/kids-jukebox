import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';

export default function PinChangeForm({ forced, onDone }) {
  const { changePin } = useAuth();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{4,}$/.test(newPin)) {
      setError('New PIN must be at least 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await changePin(currentPin, newPin);
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-sm flex-col gap-4">
      {forced ? (
        <p className="text-sm text-violet-600">
          You're using the initial setup PIN. Please choose a new one to continue.
        </p>
      ) : null}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-violet-900">Current PIN</span>
        <input
          type="password"
          inputMode="numeric"
          value={currentPin}
          onChange={(e) => setCurrentPin(e.target.value)}
          className="rounded-lg border-2 border-violet-200 px-4 py-2 text-lg"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-violet-900">New PIN</span>
        <input
          type="password"
          inputMode="numeric"
          value={newPin}
          onChange={(e) => setNewPin(e.target.value)}
          className="rounded-lg border-2 border-violet-200 px-4 py-2 text-lg"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-violet-900">Confirm new PIN</span>
        <input
          type="password"
          inputMode="numeric"
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value)}
          className="rounded-lg border-2 border-violet-200 px-4 py-2 text-lg"
        />
      </label>
      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-violet-600 px-4 py-3 text-lg font-bold text-white shadow disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'Save new PIN'}
      </button>
    </form>
  );
}
