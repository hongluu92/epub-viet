'use client';

import { useState, useEffect, useRef } from 'react';
import { useTtsStore } from '@/lib/stores/tts-store';
import { useAppStore } from '@/lib/stores/app-store';

const SLEEP_OPTIONS = [5, 15, 30, 60]; // minutes

/**
 * Bottom TTS control bar matching mockup design.
 * Shows: prev | play/pause | next | progress | speed | bookmark
 */
export default function TtsBar({
  sentences,
  sentenceMap,
  chapterIndex,
  totalChapters,
  playStartIndex = 0,
  onChapterChange,
  play,
  pause,
  resume,
  stop,
}) {
  const { isPlaying, isPaused, modelLoading, modelProgress, preparing, pausing, currentFlatIndex, ttsUnavailable, sleepTimerMinutes, setSleepTimer, clearSleepTimer } = useTtsStore();
  const { ttsSpeed, setTtsSpeed } = useAppStore();
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [sleepRemaining, setSleepRemaining] = useState(null); // seconds
  const sleepEndRef = useRef(null);

  // Sleep timer countdown
  useEffect(() => {
    if (sleepTimerMinutes == null) {
      sleepEndRef.current = null;
      setSleepRemaining(null);
      return;
    }
    sleepEndRef.current = Date.now() + sleepTimerMinutes * 60000;
    const tick = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((sleepEndRef.current - Date.now()) / 1000));
      setSleepRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(tick);
        clearSleepTimer();
        stop();
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [sleepTimerMinutes, clearSleepTimer, stop]);

  const totalSentences = sentences?.length || 0;
  const progress = totalSentences > 0 ? (currentFlatIndex / totalSentences) * 100 : 0;
  const showLoading = modelLoading || preparing || pausing;

  const handlePlayPause = async () => {
    if (showLoading) return;
    if (isPlaying && !isPaused) {
      await pause();
    } else if (isPaused) {
      await resume();
    } else {
      await play(sentences, playStartIndex, chapterIndex, sentenceMap);
    }
  };

  // Navigate to previous/next chapter and auto-play first sentence
  const handlePrevChapter = async () => {
    if (chapterIndex <= 0) return;
    stop();
    onChapterChange?.(chapterIndex - 1);
  };

  const handleNextChapter = async () => {
    if (chapterIndex >= totalChapters - 1) return;
    stop();
    onChapterChange?.(chapterIndex + 1);
  };

  // Cycle speed: 0.75 → 1.0 → 1.25 → 1.5 → 2.0 → 0.75
  const handleSpeedCycle = () => {
    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    // Find nearest preset >= current speed, or wrap to first
    const idx = speeds.findIndex((s) => s >= ttsSpeed);
    const nextIdx = idx === -1 ? 0 : (speeds[idx] === ttsSpeed ? (idx + 1) % speeds.length : idx);
    setTtsSpeed(speeds[nextIdx]);
  };

  const speedLabel = ttsSpeed === 1.0 ? '1x' : `${ttsSpeed}x`;

  // Show banner when WASM is blocked (Edge Enhanced Protection, etc.)
  if (ttsUnavailable) {
    return (
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-center border-t"
        style={{
          background: 'var(--nav-bg)',
          borderColor: 'var(--border)',
          padding: '10px 20px',
          paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
          zIndex: 50,
        }}
      >
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Trình duyệt không hỗ trợ đọc văn bản (WASM bị chặn)
        </span>
      </div>
    );
  }

  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 backdrop-blur-xl border-t"
      style={{
        background: 'var(--nav-bg)',
        borderColor: 'var(--border)',
        padding: '12px 20px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        zIndex: 50,
      }}
    >
      {/* Prev Chapter */}
      <button
        onClick={handlePrevChapter}
        className="w-9 h-9 flex items-center justify-center rounded-full"
        style={{ color: chapterIndex <= 0 ? 'var(--text-muted)' : 'var(--text-secondary)' }}
        aria-label="Previous chapter"
        disabled={chapterIndex <= 0}
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
        disabled={showLoading}
      >
        {modelLoading ? (
          <div className="flex flex-col items-center leading-none">
            <span className="text-xs font-semibold">{modelProgress}%</span>
            <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.7)' }}>Tải giọng đọc</span>
          </div>
        ) : preparing || pausing ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
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

      {/* Next Chapter */}
      <button
        onClick={handleNextChapter}
        className="w-9 h-9 flex items-center justify-center rounded-full"
        style={{ color: chapterIndex >= totalChapters - 1 ? 'var(--text-muted)' : 'var(--text-secondary)' }}
        aria-label="Next chapter"
        disabled={chapterIndex >= totalChapters - 1}
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

      {/* Sleep Timer */}
      <div className="relative">
        <button
          onClick={() => setShowSleepMenu(!showSleepMenu)}
          className="text-xs font-semibold rounded-md"
          style={{
            color: sleepRemaining ? 'var(--accent)' : 'var(--text-secondary)',
            background: 'rgba(0,0,0,0.05)',
            padding: '4px 6px',
          }}
          aria-label="Hẹn giờ tắt"
        >
          {sleepRemaining
            ? `${Math.floor(sleepRemaining / 60)}:${String(sleepRemaining % 60).padStart(2, '0')}`
            : '🌙'}
        </button>
        {showSleepMenu && (
          <div className="absolute bottom-full right-0 mb-2 rounded-xl shadow-lg p-2 min-w-[120px]"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            {SLEEP_OPTIONS.map((m) => (
              <button key={m} onClick={() => { setSleepTimer(m); setShowSleepMenu(false); }}
                className="block w-full text-left text-xs px-3 py-1.5 rounded-lg"
                style={{ color: 'var(--text)' }}>
                {m} phút
              </button>
            ))}
            {sleepRemaining && (
              <button onClick={() => { clearSleepTimer(); setShowSleepMenu(false); }}
                className="block w-full text-left text-xs px-3 py-1.5 rounded-lg mt-1"
                style={{ color: 'var(--accent)' }}>
                Tắt hẹn giờ
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
