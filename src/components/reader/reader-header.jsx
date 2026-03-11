'use client';

import { useState } from 'react';
import ChapterDropdown from './chapter-dropdown';

export default function ReaderHeader({ book, chapters, currentChapterIndex, onChapterSelect, onToggleSettings }) {
  const [showChapters, setShowChapters] = useState(false);
  const currentChapter = chapters.find((c) => c.chapterIndex === currentChapterIndex);
  const currentTitle = currentChapter?.title || `Chương ${currentChapterIndex + 1}`;

  return (
    <header
      className="z-40 flex items-center gap-3 px-4 py-3 backdrop-blur-md border-b relative"
      style={{
        backgroundColor: 'var(--nav-bg)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Back button */}
      <button
        onClick={() => window.history.back()}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full"
        style={{ color: 'var(--text)' }}
        aria-label="Back"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* Chapter title + dropdown toggle */}
      <button
        className="flex-1 min-w-0 flex items-center gap-1 text-left"
        onClick={() => setShowChapters(!showChapters)}
      >
        <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
          {currentTitle}
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`flex-shrink-0 transition-transform ${showChapters ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-muted)' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Settings (Aa) button */}
      <button
        onClick={onToggleSettings}
        className="flex-shrink-0 flex items-center justify-center rounded-md text-xs font-semibold"
        style={{
          color: 'var(--accent)',
          background: 'rgba(192,57,43,0.1)',
          padding: '4px 8px',
        }}
        aria-label="Reading settings"
      >
        Aa
      </button>

      {/* Chapter dropdown */}
      {showChapters && (
        <ChapterDropdown
          chapters={chapters}
          currentIndex={currentChapterIndex}
          onSelect={(index) => {
            onChapterSelect(index);
            setShowChapters(false);
          }}
          onClose={() => setShowChapters(false)}
        />
      )}
    </header>
  );
}
