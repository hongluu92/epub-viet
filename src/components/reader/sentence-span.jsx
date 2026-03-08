'use client';

import { useRef, useCallback } from 'react';
import { useTtsStore } from '@/lib/stores/tts-store';

export default function SentenceSpan({ text, chapterIndex, paragraphIndex, sentenceIndex, onLongPress }) {
  const timerRef = useRef(null);
  const movedRef = useRef(false);

  const { currentChapter, currentParagraph, currentSentence, isPlaying } = useTtsStore();

  const isActive =
    isPlaying &&
    currentChapter === chapterIndex &&
    currentParagraph === paragraphIndex &&
    currentSentence === sentenceIndex;

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
      className={`sentence-span ${isActive ? 'tts-active' : ''}`}
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
