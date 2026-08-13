import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import SpotifyConnect from './SpotifyConnect.jsx';
import PlaylistManager from './PlaylistManager.jsx';
import ManualOverrides from './ManualOverrides.jsx';
import QueueManager from './QueueManager.jsx';
import PinChangeForm from './PinChangeForm.jsx';

const TABS = [
  { id: 'songs', label: 'Songs' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'queue', label: 'Queue' },
  { id: 'spotify', label: 'Spotify' },
  { id: 'pin', label: 'Change PIN' },
];

export default function ParentShell() {
  const [tab, setTab] = useState('songs');
  const auth = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.logout();
    navigate('/');
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-violet-950">Parent Settings</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/')}
            className="rounded-lg bg-violet-100 px-3 py-2 text-sm font-semibold text-violet-700"
          >
            Back to Jukebox
          </button>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-violet-100 px-3 py-2 text-sm font-semibold text-violet-700"
          >
            Log out
          </button>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-violet-100 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === t.id ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto">
        {tab === 'spotify' ? <SpotifyConnect /> : null}
        {tab === 'playlists' ? <PlaylistManager /> : null}
        {tab === 'songs' ? <ManualOverrides /> : null}
        {tab === 'queue' ? <QueueManager /> : null}
        {tab === 'pin' ? <PinChangeForm onDone={() => setTab('songs')} /> : null}
      </div>
    </div>
  );
}
