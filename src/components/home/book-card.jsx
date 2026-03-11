'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import BookCover from './book-cover';

// Book card for horizontal scroll sections.
// Shows cover with progress bar, title, and chapter count.
// When onClick is provided, calls it instead of navigating via Link.
export default function BookCard({ book, onClick, onDelete }) {
  const progress = book.readingProgress ?? 0;
  const chapterInfo = progress > 0
    ? `${Math.round(progress * 100)}% · Ch. ${(book.currentChapter ?? 0) + 1}/${book.chapterCount || '?'}`
    : book.chapterCount ? `${book.chapterCount} chuong` : (book.author || '');

  const Wrapper = onClick ? 'div' : Link;
  const wrapperProps = onClick
    ? { onClick: () => onClick(book), className: 'flex-shrink-0 w-[100px] group cursor-pointer' }
    : { href: `/reader?id=${book.id}`, className: 'flex-shrink-0 w-[100px] group' };

  return (
    <Wrapper {...wrapperProps}>
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
        {/* Delete button overlay - visible on hover */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (window.confirm(`Xoa "${book.title}" khoi thu vien?`)) onDelete(book);
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
  );
}
