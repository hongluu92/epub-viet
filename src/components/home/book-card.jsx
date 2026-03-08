'use client';

import Link from 'next/link';
import BookCover from './book-cover';

// Book card for horizontal scroll sections.
// Shows cover with progress bar, title, and chapter count.
export default function BookCard({ book }) {
  const progress = book.readingProgress ?? 0;
  const chapterInfo = book.currentChapterIndex != null
    ? `Ch. ${book.currentChapterIndex + 1}`
    : `${book.chapterCount ?? 0} chuong`;

  return (
    <Link href={`/reader/${book.id}`} className="flex-shrink-0 w-[100px]">
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
    </Link>
  );
}
