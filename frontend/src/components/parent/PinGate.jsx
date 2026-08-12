import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import PinChangeForm from './PinChangeForm.jsx';

export default function PinGate({ children }) {
  const auth = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (auth.loading) {
    return <div className="flex h-full items-center justify-center text-xl">Loading…</div>;
  }

  if (!auth.authenticated) {
    const handleSubmit = async (e) => {
      e.preventDefault();
      setError(null);
      setSubmitting(true);
      try {
        await auth.login(pin);
      } catch (err) {
        setError(err.message);
      } finally {
        setSubmitting(false);
        setPin('');
      }
    };

    return (
      <div className="flex h-full items-center justify-center bg-violet-100 p-6">
        <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-4">
          <h1 className="text-center text-2xl font-bold text-violet-950">Parent Settings</h1>
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="rounded-lg border-2 border-violet-300 px-4 py-3 text-center text-2xl tracking-widest"
          />
          {error ? <p className="text-center text-sm font-semibold text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-violet-600 px-4 py-3 text-lg font-bold text-white shadow disabled:opacity-50"
          >
            {submitting ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      </div>
    );
  }

  if (auth.mustChangePin) {
    return (
      <div className="flex h-full items-center justify-center bg-violet-100 p-6">
        <div className="w-full max-w-sm">
          <h1 className="mb-4 text-center text-2xl font-bold text-violet-950">Choose a new PIN</h1>
          <PinChangeForm forced onDone={auth.refresh} />
        </div>
      </div>
    );
  }

  return children;
}
