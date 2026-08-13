import { useEffect, useRef, useState } from 'react';
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
  const [searchOpen, setSearchOpen] = useState(false);

  const closeSearch = () => {
    setQuery('');
    setSearchOpen(false);
  };
  const handleToggleSearch = () => {
    if (searchOpen) closeSearch();
    else setSearchOpen(true);
  };

  const advanceAndPlay = async () => {
    const state = await queue.advance();
    if (state.nowPlaying) {
      const started = await playTrackUri(state.nowPlaying.uri);
      queue.reportPlayback(started);
    } else {
      // Nothing left queued - explicitly stop the device instead of
      // leaving whatever was last playing running orphaned.
      await pausePlayback();
      queue.reportPlayback(false);
    }
  };

  const {
    ready,
    reconnecting,
    error: playbackError,
    isPlaying,
    progress,
    playTrackUri,
    pausePlayback,
    togglePlayback,
  } = usePlaybackSDK({
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
    <div className="min-h-full overflow-x-hidden bg-black">
      <div className="sticky top-0 z-10 flex flex-col gap-3 bg-black p-4 pb-3 shadow-sm">
        <NowPlayingBar
          nowPlaying={queue.nowPlaying}
          queue={queue.queue}
          onSkip={handleSkip}
          reconnecting={reconnecting}
          playbackError={playbackError}
          isPlaying={isPlaying}
          onTogglePlayback={togglePlayback}
          progress={progress}
          searchOpen={searchOpen}
          onToggleSearch={handleToggleSearch}
        />
        {searchOpen ? (
          <SearchBox query={query} onQueryChange={setQuery} onClose={closeSearch} />
        ) : null}
      </div>
      <HiddenSettingsHandle />

      <div className="mx-4 mb-4 overflow-hidden rounded-3xl border-4 border-violet-800 bg-violet-950">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-2xl text-violet-400">
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
