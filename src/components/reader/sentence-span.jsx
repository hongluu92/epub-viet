'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useTtsStore } from '@/lib/stores/tts-store';
import { useAppStore } from '@/lib/stores/app-store';

export default function SentenceSpan({ text, bookId, chapterIndex, paragraphIndex, sentenceIndex, onLongPress }) {
  const timerRef = useRef(null);
  const movedRef = useRef(false);
  const spanRef = useRef(null);

  const { currentChapter, currentParagraph, currentSentence, isPlaying } = useTtsStore();
  const bookmarks = useAppStore((s) => s.bookmarks);

  const isActive =
    isPlaying &&
    currentChapter === chapterIndex &&
    currentParagraph === paragraphIndex &&
    currentSentence === sentenceIndex;

  const isBookmarked = bookmarks.some((b) =>
    b.bookId === bookId && b.chapterIndex === chapterIndex &&
    b.paragraphIndex === paragraphIndex && b.sentenceIndex === sentenceIndex
  );

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
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress?.({ text, chapterIndex, paragraphIndex, sentenceIndex, target: e.target });
      }}
    >
      {text}
    </span>
  );
}
