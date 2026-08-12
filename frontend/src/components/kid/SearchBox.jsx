import { useState } from 'react';

export default function SearchBox({ query, onQueryChange }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Search songs"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-md active:scale-95"
      >
        🔍
      </button>
    );
  }

  return (
    <div className="flex w-full items-center gap-3">
      <input
        autoFocus
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search songs..."
        className="h-16 flex-1 rounded-full border-4 border-violet-200 px-6 text-3xl font-semibold text-violet-950 shadow-inner focus:outline-none focus:border-violet-400"
      />
      <button
        onClick={() => {
          onQueryChange('');
          setOpen(false);
        }}
        aria-label="Close search"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-md active:scale-95"
      >
        ✕
      </button>
    </div>
  );
}
