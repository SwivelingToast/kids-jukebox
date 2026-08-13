export default function AlbumTile({ track, overlay = true, onTap }) {
  const title = track.name;

  return (
    <button onClick={() => onTap(track)} className="w-full text-left transition-transform active:scale-95">
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-violet-200 shadow-md">
        {track.albumArtUrl ? (
          <img
            src={track.albumArtUrl}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl">🎵</div>
        )}

        {overlay ? (
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <p className="line-clamp-2 rounded-xl bg-black/20 px-3 py-2 text-center text-xl font-bold text-white md:text-2xl">
              {title}
            </p>
          </div>
        ) : null}
      </div>
      {!overlay ? (
        <p className="mt-2 line-clamp-2 text-center text-lg font-bold text-violet-950">{title}</p>
      ) : null}
    </button>
  );
}
