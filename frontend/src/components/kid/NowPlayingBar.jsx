export default function NowPlayingBar({
  nowPlaying,
  queue,
  onSkip,
  reconnecting,
  playbackError,
  isPlaying,
  onTogglePlayback,
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white/80 p-4 shadow-md">
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

      {nowPlaying ? (
        <button
          onClick={onSkip}
          aria-label="Skip song"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-500 text-2xl text-white shadow-md active:scale-95"
        >
          ⏭
        </button>
      ) : null}
    </div>
  );
}
