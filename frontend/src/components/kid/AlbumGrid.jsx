import AlbumTile from './AlbumTile.jsx';

export default function AlbumGrid({ tracks, onSelect, emptyMessage }) {
  if (tracks.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8 text-center text-2xl font-semibold text-violet-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-6 p-6 sm:grid-cols-3 md:grid-cols-4">
      {tracks.map((track) => (
        <AlbumTile key={track.uri} track={track} onTap={onSelect} />
      ))}
    </div>
  );
}
