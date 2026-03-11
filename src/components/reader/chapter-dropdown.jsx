'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export default function ChapterDropdown({ chapters, currentIndex, onSelect, onClose }) {
  const ref = useRef(null);
  const activeRef = useRef(null);
  const inputRef = useRef(null);
  const [search, setSearch] = useState('');
  const [focusedIdx, setFocusedIdx] = useState(-1);

  // Filter chapters by search term
  const filtered = search.trim()
    ? chapters.filter((ch) => {
        const q = search.toLowerCase();
        const title = (ch.title || '').toLowerCase();
        const num = String(ch.chapterIndex + 1);
        return title.includes(q) || num.includes(q);
      })
    : chapters;

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

  // Scroll active item into view after mount
  useEffect(() => {
    if (!search) {
      requestAnimationFrame(() => {
        activeRef.current?.scrollIntoView({ block: 'center' });
      });
    }
  }, [search]);

  // Focus search input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset focused index when search changes
  useEffect(() => {
    setFocusedIdx(-1);
  }, [search]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && focusedIdx >= 0 && focusedIdx < filtered.length) {
      e.preventDefault();
      onSelect(filtered[focusedIdx].chapterIndex);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filtered, focusedIdx, onSelect, onClose]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIdx >= 0) {
      const el = ref.current?.querySelector(`[data-dropdown-idx="${focusedIdx}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIdx]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 right-0 mt-1 mx-3 rounded-xl shadow-lg overflow-hidden z-50 flex flex-col"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        maxHeight: '60vh',
      }}
    >
      {/* Search input — only show when >10 chapters */}
      {chapters.length > 10 && (
        <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm chương..."
            className="w-full px-3 py-2 text-sm rounded-lg outline-none"
            style={{
              backgroundColor: 'var(--bg)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          />
        </div>
      )}

      {/* Chapter list */}
      <div className="overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Không tìm thấy chương nào
          </div>
        ) : (
          filtered.map((ch, idx) => {
            const isActive = ch.chapterIndex === currentIndex;
            const isFocused = idx === focusedIdx;
            return (
              <button
                key={ch.chapterIndex}
                ref={isActive && !search ? activeRef : null}
                data-dropdown-idx={idx}
                onClick={() => onSelect(ch.chapterIndex)}
                className="w-full text-left px-4 py-3 text-sm transition-colors border-b last:border-b-0 flex items-baseline gap-2"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: isActive
                    ? 'var(--highlight-tts)'
                    : isFocused
                      ? 'rgba(128,128,128,0.1)'
                      : 'transparent',
                  color: isActive ? 'var(--text)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                <span
                  className="flex-shrink-0 text-xs tabular-nums"
                  style={{ color: 'var(--text-muted)', minWidth: '2ch' }}
                >
                  {ch.chapterIndex + 1}
                </span>
                <span className="truncate">
                  {ch.title || `Chương ${ch.chapterIndex + 1}`}
                </span>
                {isActive && (
                  <span className="ml-auto flex-shrink-0 text-xs" style={{ color: 'var(--accent)' }}>
                    ●
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
