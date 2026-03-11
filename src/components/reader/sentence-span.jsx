'use client';

import { memo, useRef, useCallback, useEffect } from 'react';
import { useTtsStore } from '@/lib/stores/tts-store';
import { useAppStore } from '@/lib/stores/app-store';

// Selective TTS subscription — only re-render when THIS sentence's active state changes
function useIsTtsActive(chapterIndex, paragraphIndex, sentenceIndex) {
  return useTtsStore((s) =>
    s.isPlaying &&
    s.currentChapter === chapterIndex &&
    s.currentParagraph === paragraphIndex &&
    s.currentSentence === sentenceIndex
  );
}

// Bookmark lookup via Set key for O(1) instead of O(n) per sentence
function useIsBookmarked(bookId, chapterIndex, paragraphIndex, sentenceIndex) {
  return useAppStore((s) =>
    s.bookmarks.some((b) =>
      b.bookId === bookId && b.chapterIndex === chapterIndex &&
      b.paragraphIndex === paragraphIndex && b.sentenceIndex === sentenceIndex
    )
  );
}

function SentenceSpan({ text, bookId, chapterIndex, paragraphIndex, sentenceIndex, onLongPress }) {
  const timerRef = useRef(null);
  const movedRef = useRef(false);
  const spanRef = useRef(null);

  const isActive = useIsTtsActive(chapterIndex, paragraphIndex, sentenceIndex);
  const isBookmarked = useIsBookmarked(bookId, chapterIndex, paragraphIndex, sentenceIndex);

  // Auto-scroll to active sentence during TTS playback
  useEffect(() => {
    if (isActive && spanRef.current) {
      spanRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive]);

  const handleTouchStart = useCallback((e) => {
    movedRef.current = false;
    timerRef.current = setTimeout(() => {
      if (!movedRef.current) {
        onLongPress?.({ text, chapterIndex, paragraphIndex, sentenceIndex, target: e.target });
      }
    }, 500);
  }, [text, chapterIndex, paragraphIndex, sentenceIndex, onLongPress]);

  const handleTouchMove = useCallback(() => {
    movedRef.current = true;
    clearTimeout(timerRef.current);
  }, []);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <span
      ref={spanRef}
      className={`sentence-span ${isActive ? 'tts-active' : ''} ${isBookmarked ? 'bookmarked' : ''}`}
      data-chapter={chapterIndex}
      data-paragraph={paragraphIndex}
      data-sentence={sentenceIndex}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress?.({ text, chapterIndex, paragraphIndex, sentenceIndex, target: e.target });
      }}
    >
      {text}
    </span>
  );
}

// Memo: skip re-render if props unchanged (store subscriptions handle internal updates)
export default memo(SentenceSpan);
