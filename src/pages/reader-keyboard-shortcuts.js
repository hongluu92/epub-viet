import { useEffect } from 'react';

/**
 * useReaderKeyboardShortcuts — attaches keyboard shortcuts for the reader page.
 *
 * Space       → play / pause
 * ArrowRight  → next sentence
 * ArrowLeft   → prev sentence
 * Escape      → navigate back
 */
export default function useReaderKeyboardShortcuts({
  isPlaying,
  isPaused,
  sentences,
  play,
  pause,
  resume,
  skipNext,
  skipPrev,
  onBack,
}) {
  useEffect(() => {
    function handleKey(e) {
      // Ignore when focus is inside an input/select/textarea
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (isPlaying && !isPaused) pause();
          else if (isPaused) resume();
          else play(sentences, 0);
          break;

        case 'ArrowRight':
          e.preventDefault();
          skipNext(sentences);
          break;

        case 'ArrowLeft':
          e.preventDefault();
          skipPrev(sentences);
          break;

        case 'Escape':
          onBack();
          break;

        default:
          break;
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPlaying, isPaused, sentences, play, pause, resume, skipNext, skipPrev, onBack]);
}
