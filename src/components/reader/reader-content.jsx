'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { FONT_FAMILIES } from '@/lib/utils/theme-tokens';
import ChapterBlock from './chapter-block';
import ChapterDivider from './chapter-divider';

export default function ReaderContent({
  loadedChapters,
  bookId,
  initialScrollProgress = 0,
  onLoadNext,
  hasMore,
  onScrollProgress,
  onVisibleChapterChange,
  onLongPressSentence,
}) {
  const containerRef = useRef(null);
  const sentinelRef = useRef(null);
  const restoreDoneRef = useRef(false);
  const { fontSize, lineHeight, readerMargin, fontFamily } = useAppStore();

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onLoadNext();
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, onLoadNext]);

  // Track visible chapter: find chapter element closest to top of scroll container
  useEffect(() => {
    const container = containerRef.current;
    if (!container || loadedChapters.length === 0) return;

    function updateVisibleChapter() {
      const chapterEls = container.querySelectorAll('[data-chapter-index]');
      const containerTop = container.getBoundingClientRect().top;
      let best = null;

      for (const el of chapterEls) {
        const rect = el.getBoundingClientRect();
        const relativeTop = rect.top - containerTop;
        // Chapter whose top is closest to (but not far below) the container top
        if (rect.bottom - containerTop > 0) {
          best = el;
          break;
        }
      }

      if (best) {
        const idx = parseInt(best.dataset.chapterIndex, 10);
        if (!isNaN(idx)) onVisibleChapterChange?.(idx);
      }
    }

    container.addEventListener('scroll', updateVisibleChapter, { passive: true });
    updateVisibleChapter(); // initial
    return () => container.removeEventListener('scroll', updateVisibleChapter);
  }, [loadedChapters, onVisibleChapterChange]);

  // Track scroll progress
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const progress = el.scrollTop / (el.scrollHeight - el.clientHeight || 1);
    onScrollProgress?.(Math.min(1, Math.max(0, progress)));
  }, [onScrollProgress]);

  // Reset restore flag when chapters change (e.g. chapter selection)
  const prevChaptersRef = useRef(loadedChapters);
  useEffect(() => {
    if (prevChaptersRef.current !== loadedChapters) {
      restoreDoneRef.current = false;
      prevChaptersRef.current = loadedChapters;
    }
  }, [loadedChapters]);

  // Restore saved scroll progress (or reset to top) after chapter content is mounted.
  useEffect(() => {
    if (restoreDoneRef.current) return;
    const el = containerRef.current;
    if (!el || loadedChapters.length === 0) return;
    restoreDoneRef.current = true;
    const targetProgress = Math.min(1, Math.max(0, initialScrollProgress || 0));

    // Always scroll to correct position (including top when progress is 0)
    const applyRestore = () => {
      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
      el.scrollTop = maxScroll * targetProgress;
      if (targetProgress > 0) onScrollProgress?.(targetProgress);
    };

    requestAnimationFrame(() => {
      applyRestore();
      setTimeout(applyRestore, 120);
    });
  }, [loadedChapters, initialScrollProgress, onScrollProgress]);

  const fontFamilyValue = FONT_FAMILIES[fontFamily] || FONT_FAMILIES.lora;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto"
      onScroll={handleScroll}
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div
        className="reader-content py-6 pb-20"
        style={{
          '--reader-font-size': `${fontSize}px`,
          '--reader-line-height': String(lineHeight),
          '--reader-margin': `${readerMargin}px`,
          fontFamily: fontFamilyValue,
        }}
      >
        {loadedChapters.map((chapter, idx) => (
          <div key={chapter.chapterIndex} data-chapter-index={chapter.chapterIndex}>
            {idx > 0 && <ChapterDivider />}
            <ChapterBlock
              chapter={chapter}
              bookId={bookId}
              onLongPressSentence={onLongPressSentence}
            />
          </div>
        ))}

        {/* Sentinel for infinite scroll */}
        {hasMore && (
          <div ref={sentinelRef} className="py-8 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Loading next chapter...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
