'use client';

import { useEffect } from 'react';

/**
 * Reader keyboard shortcuts hook.
 *
 * Bindings (only active when focus is NOT in an input/textarea):
 *   Space      → Play / Pause TTS
 *   ArrowLeft  → Previous sentence
 *   ArrowRight → Next sentence
 *   Escape     → Close open overlays (settings, chapter dropdown, bookmark popup)
 *   Ctrl+B     → Bookmark current sentence
 *
 * @param {Object} handlers
 * @param {Function} handlers.onPlayPause   - Toggle TTS play/pause
 * @param {Function} handlers.onPrevSentence
 * @param {Function} handlers.onNextSentence
 * @param {Function} handlers.onEscape
 * @param {Function} handlers.onBookmark
 * @param {boolean}  enabled               - Set false to disable (e.g. when modal is open)
 */
export function useKeyboardShortcuts({
  onPlayPause,
  onPrevSentence,
  onNextSentence,
  onEscape,
  onBookmark,
  enabled = true,
} = {}) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Skip when typing in an input, textarea, or contenteditable
      const tag = e.target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        e.target?.isContentEditable
      ) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          onPlayPause?.();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onPrevSentence?.();
          break;
        case 'ArrowRight':
          e.preventDefault();
          onNextSentence?.();
          break;
        case 'Escape':
          onEscape?.();
          break;
        case 'b':
        case 'B':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onBookmark?.();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onPlayPause, onPrevSentence, onNextSentence, onEscape, onBookmark]);
}
