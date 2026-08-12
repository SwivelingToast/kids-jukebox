import { useEffect, useRef } from 'react';
import { useApprovedLibrary } from '../../hooks/useApprovedLibrary.js';
import { useQueue } from '../../hooks/useQueue.js';
import { usePlaybackSDK } from '../../hooks/usePlaybackSDK.js';
import AlbumGrid from './AlbumGrid.jsx';
import SearchBox from './SearchBox.jsx';
import NowPlayingBar from './NowPlayingBar.jsx';
import HiddenSettingsHandle from './HiddenSettingsHandle.jsx';

export default function Home() {
  const { filtered, loading, query, setQuery } = useApprovedLibrary();
  const queue = useQueue();
  const hasResumedRef = useRef(false);

  const advanceAndPlay = async () => {
    const state = await queue.advance();
    if (state.nowPlaying) {
      await playTrackUri(state.nowPlaying.uri);
      queue.reportPlayback(true);
    } else {
      queue.reportPlayback(false);
    }
  };

  const { ready, reconnecting, playTrackUri } = usePlaybackSDK({
    onTrackEnd: advanceAndPlay,
  });

  // If the tab was refreshed mid-song, resume once the SDK device is ready.
  useEffect(() => {
    if (ready && !hasResumedRef.current && queue.nowPlaying) {
      hasResumedRef.current = true;
      playTrackUri(queue.nowPlaying.uri);
    }
  }, [ready, queue.nowPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = async (track) => {
    const state = await queue.enqueue(track.uri);
    if (!state.nowPlaying) {
      await advanceAndPlay();
    }
  };

  const handleSkip = async () => {
    await advanceAndPlay();
  };

  return (
    <div className="flex h-full flex-col bg-violet-50">
      <div className="flex items-center gap-4 p-4">
        <SearchBox query={query} onQueryChange={setQuery} />
        <NowPlayingBar
          nowPlaying={queue.nowPlaying}
          queue={queue.queue}
          onSkip={handleSkip}
          reconnecting={reconnecting}
        />
        <HiddenSettingsHandle />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-2xl text-violet-400">
            Loading songs…
          </div>
        ) : (
          <AlbumGrid
            tracks={filtered}
            onSelect={handleSelect}
            emptyMessage={
              query
                ? 'No songs match that search.'
                : 'No songs yet — ask a grown-up to add some in Settings.'
            }
          />
        )}
      </div>
    </div>
  );
}
