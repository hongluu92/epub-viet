'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
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
  const [slideClass, setSlideClass] = useState('');
  const slideTimerRef = useRef(null);
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

  // Track visible chapter with rAF throttle to avoid layout thrashing on every scroll pixel
  useEffect(() => {
    const container = containerRef.current;
    if (!container || loadedChapters.length === 0) return;

    let rafId = 0;
    function updateVisibleChapter() {
      if (rafId) return; // already scheduled
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const chapterEls = container.querySelectorAll('[data-chapter-index]');
        const containerTop = container.getBoundingClientRect().top;

        for (const el of chapterEls) {
          const rect = el.getBoundingClientRect();
          if (rect.bottom - containerTop > 0) {
            const idx = parseInt(el.dataset.chapterIndex, 10);
            if (!isNaN(idx)) onVisibleChapterChange?.(idx);
            break;
          }
        }
      });
    }

    container.addEventListener('scroll', updateVisibleChapter, { passive: true });
    updateVisibleChapter(); // initial
    return () => {
      container.removeEventListener('scroll', updateVisibleChapter);
      cancelAnimationFrame(rafId);
    };
  }, [loadedChapters, onVisibleChapterChange]);

  // Track scroll progress
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const progress = el.scrollTop / (el.scrollHeight - el.clientHeight || 1);
    onScrollProgress?.(Math.min(1, Math.max(0, progress)));
  }, [onScrollProgress]);

  // Reset restore flag only when chapters are replaced (e.g. chapter selection),
  // NOT when new chapters are appended via infinite scroll.
  const prevChaptersRef = useRef(loadedChapters);
  useEffect(() => {
    if (prevChaptersRef.current !== loadedChapters) {
      const prev = prevChaptersRef.current;
      const next = loadedChapters;
      // Detect replacement: first chapter changed or array shrunk (jump to new chapter)
      const isReplacement =
        next.length === 0 ||
        prev.length === 0 ||
        prev[0]?.chapterIndex !== next[0]?.chapterIndex ||
        next.length < prev.length;
      if (isReplacement) {
        restoreDoneRef.current = false;
        // Immediately reset scroll to top to avoid race with scroll events
        if (containerRef.current) containerRef.current.scrollTop = 0;
        // Trigger slide animation (with cleanup)
        clearTimeout(slideTimerRef.current);
        setSlideClass('chapter-slide-enter');
        slideTimerRef.current = setTimeout(() => setSlideClass(''), 300);
      }
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
        className={`reader-content py-6 pb-20 ${slideClass}`}
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
              Đang tải chương tiếp...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
