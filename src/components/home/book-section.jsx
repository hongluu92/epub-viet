'use client';

import BookCard from './book-card';

// Horizontal scrollable section with title and optional "view all" link.
export default function BookSection({ title, books, showViewAll = false, onDelete }) {
  if (!books || books.length === 0) return null;

  return (
    <section className="mb-6">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
          {title}
        </h2>
        {showViewAll && (
          <button className="text-sm" style={{ color: 'var(--accent)' }}>
            Xem tất cả
          </button>
        )}
      </div>

      {/* Horizontal scroll row */}
      <div
        className="flex gap-3 px-4 pb-2 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        <style>{`.book-section-scroll::-webkit-scrollbar { display: none; }`}</style>
        {books.map((book) => (
          <BookCard key={book.id} book={book} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}
