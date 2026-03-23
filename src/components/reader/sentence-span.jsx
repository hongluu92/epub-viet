'use client';

import { memo, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '@/lib/stores/app-store';

// Annotation lookup — returns color string or null for highlight class
function useAnnotationColor(bookId, chapterIndex, paragraphIndex, sentenceIndex) {
  return useAppStore((s) => {
    const bm = s.bookmarks.find((b) =>
      b.bookId === bookId && b.chapterIndex === chapterIndex &&
      b.paragraphIndex === paragraphIndex && b.sentenceIndex === sentenceIndex
    );
    // Return color string for CSS class, or 'bookmarked' for legacy, or null
    if (!bm) return null;
    return bm.color || 'bookmarked';
  });
}

// isActive is now passed as prop from ChapterBlock (single subscription per chapter)
function SentenceSpan({ text, bookId, chapterIndex, paragraphIndex, sentenceIndex, isActive, onLongPress }) {
  const timerRef = useRef(null);
  const movedRef = useRef(false);
  const spanRef = useRef(null);

  const annotationColor = useAnnotationColor(bookId, chapterIndex, paragraphIndex, sentenceIndex);
  const highlightClass = annotationColor === 'bookmarked' ? 'bookmarked' : annotationColor ? `highlight-${annotationColor}` : '';

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
      className={`sentence-span ${isActive ? 'tts-active' : ''} ${highlightClass}`}
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
