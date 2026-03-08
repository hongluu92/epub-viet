'use client';

import { useTts } from '@/hooks/use-tts';
import { useTtsStore } from '@/lib/stores/tts-store';
import { useAppStore } from '@/lib/stores/app-store';

/**
 * Bottom TTS control bar matching mockup design.
 * Shows: prev | play/pause | next | progress | speed | bookmark
 */
export default function TtsBar({ sentences, sentenceMap, chapterIndex }) {
  const { play, pause, resume, stop } = useTts();
  const { isPlaying, isPaused, modelLoading, modelProgress, currentFlatIndex } = useTtsStore();
  const { ttsSpeed, setTtsSpeed } = useAppStore();

  const totalSentences = sentences?.length || 0;
  const progress = totalSentences > 0 ? (currentFlatIndex / totalSentences) * 100 : 0;

  const handlePlayPause = async () => {
    if (modelLoading) return;
    if (isPlaying && !isPaused) {
      await pause();
    } else if (isPaused) {
      await resume();
    } else {
      await play(sentences, 0, chapterIndex, sentenceMap);
    }
  };

  // Skip to previous/next sentence
  const handlePrev = async () => {
    if (!isPlaying || !sentences?.length) return;
    const prevIdx = Math.max(0, currentFlatIndex - 1);
    stop();
    await play(sentences, prevIdx, chapterIndex, sentenceMap);
  };

  const handleNext = async () => {
    if (!isPlaying || !sentences?.length) return;
    const nextIdx = Math.min(sentences.length - 1, currentFlatIndex + 1);
    stop();
    await play(sentences, nextIdx, chapterIndex, sentenceMap);
  };

  // Cycle speed: 0.75 → 1.0 → 1.25 → 1.5 → 2.0 → 0.75
  const handleSpeedCycle = () => {
    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    const idx = speeds.indexOf(ttsSpeed);
    const next = speeds[(idx + 1) % speeds.length];
    setTtsSpeed(next);
  };

  const speedLabel = ttsSpeed === 1.0 ? '1x' : `${ttsSpeed}x`;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 backdrop-blur-xl border-t"
      style={{
        height: 72,
        background: 'var(--nav-bg)',
        borderColor: 'var(--border)',
        paddingBottom: 16,
        paddingLeft: 20,
        paddingRight: 20,
        zIndex: 50,
      }}
    >
      {/* Prev */}
      <button
        onClick={handlePrev}
        className="w-9 h-9 flex items-center justify-center rounded-full"
        style={{ color: 'var(--text-secondary)' }}
        aria-label="Previous sentence"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
        </svg>
      </button>

      {/* Play/Pause */}
      <button
        onClick={handlePlayPause}
        className="w-11 h-11 flex items-center justify-center rounded-full"
        style={{ background: 'var(--accent)', color: 'white' }}
        aria-label={isPlaying && !isPaused ? 'Pause' : 'Play'}
        disabled={modelLoading}
      >
        {modelLoading ? (
          <span className="text-xs font-semibold">{modelProgress}%</span>
        ) : isPlaying && !isPaused ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Next */}
      <button
        onClick={handleNext}
        className="w-9 h-9 flex items-center justify-center rounded-full"
        style={{ color: 'var(--text-secondary)' }}
        aria-label="Next sentence"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
        </svg>
      </button>

      {/* Progress bar */}
      <div
        className="relative"
        style={{ flex: 1, maxWidth: 120, height: 4, background: 'var(--border)', borderRadius: 2 }}
      >
        <div
          style={{
            height: '100%',
            background: 'var(--accent)',
            borderRadius: 2,
            width: `${progress}%`,
            transition: 'width 0.3s ease',
          }}
        />
        {isPlaying && (
          <div
            style={{
              position: 'absolute',
              top: -4,
              left: `${progress}%`,
              width: 12,
              height: 12,
              background: 'var(--accent)',
              borderRadius: '50%',
              border: '2px solid white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              transform: 'translateX(-50%)',
              transition: 'left 0.3s ease',
            }}
          />
        )}
      </div>

      {/* Speed */}
      <button
        onClick={handleSpeedCycle}
        className="text-xs font-semibold rounded-md"
        style={{
          color: 'var(--text-secondary)',
          background: 'rgba(0,0,0,0.05)',
          padding: '4px 8px',
        }}
      >
        {speedLabel}
      </button>
    </div>
  );
}
