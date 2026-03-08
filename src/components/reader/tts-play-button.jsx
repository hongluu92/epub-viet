'use client';

import { useTts } from '@/hooks/use-tts';
import { useTtsStore } from '@/lib/stores/tts-store';

/**
 * Simple TTS play/pause/stop button for the reader header.
 * Requires sentences array from the current chapter.
 */
export default function TtsPlayButton({ sentences, chapterIndex }) {
  const { play, pause, resume, stop } = useTts();
  const { isPlaying, isPaused, modelLoading, modelProgress } = useTtsStore();

  const handleClick = async () => {
    if (modelLoading) return;

    if (isPlaying && !isPaused) {
      await pause();
    } else if (isPaused) {
      await resume();
    } else {
      // Flatten all sentences for the current chapter
      await play(sentences, 0, chapterIndex, 0);
    }
  };

  const handleStop = (e) => {
    e.stopPropagation();
    stop();
  };

  // Loading state
  if (modelLoading) {
    return (
      <button
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-xs"
        style={{ color: 'var(--text-muted)' }}
        disabled
      >
        {modelProgress}%
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleClick}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full"
        style={{ color: 'var(--text)' }}
        aria-label={isPlaying && !isPaused ? 'Pause TTS' : 'Play TTS'}
      >
        {isPlaying && !isPaused ? (
          /* Pause icon */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          /* Play icon */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {isPlaying && (
        <button
          onClick={handleStop}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Stop TTS"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>
      )}
    </div>
  );
}
