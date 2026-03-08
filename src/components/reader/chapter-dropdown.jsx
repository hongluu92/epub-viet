'use client';

import { useEffect, useRef } from 'react';

export default function ChapterDropdown({ chapters, currentIndex, onSelect, onClose }) {
  const ref = useRef(null);
  const activeRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [onClose]);

  // Scroll active item into view
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  return (
    <div
      ref={ref}
      className="absolute top-full left-4 right-4 mt-1 rounded-xl shadow-lg overflow-y-auto z-50"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        maxHeight: '60vh',
      }}
    >
      {chapters.map((ch) => {
        const isActive = ch.chapterIndex === currentIndex;
        return (
          <button
            key={ch.chapterIndex}
            ref={isActive ? activeRef : null}
            onClick={() => onSelect(ch.chapterIndex)}
            className="w-full text-left px-4 py-3 text-sm transition-colors border-b last:border-b-0"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: isActive ? 'var(--highlight-tts)' : 'transparent',
              color: isActive ? 'var(--text)' : 'var(--text-secondary)',
              fontWeight: isActive ? 500 : 400,
            }}
          >
            {ch.title || `Chương ${ch.chapterIndex + 1}`}
          </button>
        );
      })}
    </div>
  );
}
