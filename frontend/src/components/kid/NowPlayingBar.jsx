import HoldToSkipButton from './HoldToSkipButton.jsx';

export default function NowPlayingBar({
  nowPlaying,
  queue,
  onSkip,
  reconnecting,
  playbackError,
  isPlaying,
  onTogglePlayback,
  progress = 0,
}) {
  return (
    <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl bg-white/80 p-4 pb-5 shadow-md">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-violet-200">
        {nowPlaying?.albumArtUrl ? (
          <img src={nowPlaying.albumArtUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">🎵</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xl font-bold text-violet-950">
          {nowPlaying ? nowPlaying.name : 'Nothing playing yet'}
        </p>
        <p
          className={`truncate text-sm font-medium ${playbackError ? 'text-red-500' : 'text-violet-500'}`}
        >
          {playbackError
            ? playbackError
            : reconnecting
              ? 'Reconnecting…'
              : queue.length > 0
                ? `${queue.length} song${queue.length === 1 ? '' : 's'} up next`
                : 'Tap a song to add it!'}
        </p>
      </div>

      {nowPlaying ? (
        <button
          onClick={onTogglePlayback}
          aria-label={isPlaying ? 'Pause song' : 'Play song'}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-500 text-2xl text-white shadow-md active:scale-95"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
      ) : null}

      {nowPlaying ? <HoldToSkipButton onSkip={onSkip} /> : null}

      <div
        role="progressbar"
        aria-hidden={!nowPlaying}
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-violet-100"
      >
        <div
          className="h-full bg-violet-500 transition-[width] duration-300 ease-linear"
          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
        />
      </div>
    </div>
  );
}
