'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { X, Trash2 } from 'lucide-react';
import BookCover from './book-cover';

// Book card for horizontal scroll sections.
// Shows cover with progress bar, title, and chapter count.
// When onClick is provided, calls it instead of navigating via Link.
// onDelete: hover X button (library page style)
// onContextDelete: right-click / long-press context menu (home page style)
export default function BookCard({ book, onClick, onDelete, onContextDelete }) {
  const [contextMenu, setContextMenu] = useState(null); // { x, y }
  const longPressTimer = useRef(null);

  const progress = book.readingProgress ?? 0;
  const chapterInfo = progress > 0
    ? `${Math.round(progress * 100)}% · Ch. ${(book.currentChapter ?? 0) + 1}/${book.chapterCount || '?'}`
    : book.chapterCount ? `${book.chapterCount} chuong` : (book.author || '');

  // Right-click handler (desktop)
  const handleContextMenu = useCallback((e) => {
    if (!onContextDelete) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, [onContextDelete]);

  // Long-press handlers (mobile)
  const handleTouchStart = useCallback((e) => {
    if (!onContextDelete) return;
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      setContextMenu({ x: touch.clientX, y: touch.clientY });
    }, 500);
  }, [onContextDelete]);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  const handleDelete = useCallback(() => {
    setContextMenu(null);
    if (window.confirm(`Xóa "${book.title}" khỏi thư viện?`)) {
      onContextDelete(book);
    }
  }, [book, onContextDelete]);

  const Wrapper = onClick ? 'div' : Link;
  const wrapperProps = onClick
    ? { onClick: () => onClick(book), className: 'flex-shrink-0 w-[100px] group cursor-pointer' }
    : { href: `/reader?id=${book.id}`, className: 'flex-shrink-0 w-[100px] group' };

  return (
    <>
      <Wrapper
        {...wrapperProps}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
      >
        {/* Cover + progress bar */}
        <div className="relative" style={{ width: 100, height: 140 }}>
          <BookCover
            coverUrl={book.coverUrl}
            title={book.title}
            width={100}
            height={140}
          />
          {/* Progress bar at bottom of cover */}
          {progress > 0 && (
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{ height: 3, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '0 0 8px 8px' }}
            >
              <div
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  height: '100%',
                  backgroundColor: 'var(--accent)',
                  borderRadius: '0 0 0 8px',
                  transition: 'width 0.3s',
                }}
              />
            </div>
          )}
          {/* Delete button overlay - visible on hover (library page) */}
          {onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.confirm(`Xóa "${book.title}" khỏi thư viện?`)) onDelete(book);
              }}
              className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Book info */}
        <div className="mt-2">
          <p
            className="text-xs font-medium leading-tight"
            style={{
              color: 'var(--text)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {book.title}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {chapterInfo}
          </p>
        </div>
      </Wrapper>

      {/* Context menu popup (right-click / long-press) */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
        >
          <div
            className="absolute rounded-lg shadow-xl py-1 min-w-[160px]"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 170),
              top: Math.min(contextMenu.y, window.innerHeight - 50),
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:opacity-80"
              style={{ color: '#ef4444' }}
            >
              <Trash2 size={14} />
              Xóa khỏi thư viện
            </button>
          </div>
        </div>
      )}
    </>
  );
}
