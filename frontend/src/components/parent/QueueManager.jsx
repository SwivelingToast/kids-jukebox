import { useQueue } from '../../hooks/useQueue.js';

export default function QueueManager() {
  const queue = useQueue();

  const moveUp = (index) => {
    if (index === 0) return;
    const ids = queue.queue.map((item) => item.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    queue.reorder(ids);
  };

  const moveDown = (index) => {
    if (index === queue.queue.length - 1) return;
    const ids = queue.queue.map((item) => item.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    queue.reorder(ids);
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-violet-950">Queue</h2>

      {queue.nowPlaying ? (
        <div className="flex items-center gap-3 rounded-lg bg-violet-100 p-3">
          <span className="text-sm font-bold uppercase text-violet-600">Now playing</span>
          <span className="font-semibold text-violet-950">{queue.nowPlaying.name}</span>
        </div>
      ) : (
        <p className="text-violet-500">Nothing playing right now.</p>
      )}

      <ul className="flex flex-col gap-2">
        {queue.queue.map((item, index) => (
          <li key={item.id} className="flex items-center gap-3 rounded-lg border border-violet-100 p-2">
            <span className="w-6 text-center text-sm font-bold text-violet-400">{index + 1}</span>
            {item.track.albumArtUrl ? (
              <img src={item.track.albumArtUrl} alt="" className="h-10 w-10 rounded object-cover" />
            ) : (
              <div className="h-10 w-10 rounded bg-violet-200" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-violet-950">{item.track.name}</p>
              <p className="truncate text-sm text-violet-500">{item.track.artists.join(', ')}</p>
            </div>
            <button onClick={() => moveUp(index)} className="rounded bg-violet-100 px-2 py-1 text-sm">↑</button>
            <button onClick={() => moveDown(index)} className="rounded bg-violet-100 px-2 py-1 text-sm">↓</button>
            <button
              onClick={() => queue.removeItem(item.id)}
              className="rounded bg-red-100 px-3 py-1 text-sm font-semibold text-red-700"
            >
              Remove
            </button>
          </li>
        ))}
        {queue.queue.length === 0 ? <p className="text-violet-500">Queue is empty.</p> : null}
      </ul>

      {queue.queue.length > 0 ? (
        <button
          onClick={() => queue.clear()}
          className="w-fit rounded-lg bg-red-100 px-4 py-2 font-semibold text-red-700"
        >
          Clear queue
        </button>
      ) : null}
    </div>
  );
}
