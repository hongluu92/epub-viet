'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import { useAppStore } from '@/lib/stores/app-store';
import { useLibraryStore } from '@/lib/stores/library-store';

const COLOR_HEX = { yellow: '#FFEB3B', green: '#4CAF50', blue: '#2196F3', red: '#F44336' };
const FILTER_COLORS = [
  { key: null, label: 'Tất cả' },
  { key: 'yellow', label: 'Vàng', hex: '#FFEB3B' },
  { key: 'green', label: 'Xanh lá', hex: '#4CAF50' },
  { key: 'blue', label: 'Xanh', hex: '#2196F3' },
  { key: 'red', label: 'Đỏ', hex: '#F44336' },
];

// Groups bookmarks by bookId and maps book metadata from library.
function groupBookmarksByBook(bookmarks, books) {
  const bookMap = Object.fromEntries(books.map((b) => [b.id, b]));
  const groups = {};
  for (const bm of bookmarks) {
    if (!groups[bm.bookId]) groups[bm.bookId] = { book: bookMap[bm.bookId], items: [] };
    groups[bm.bookId].items.push(bm);
  }
  return Object.values(groups).filter((g) => g.book);
}

export default function BookmarksPage() {
  const router = useRouter();
  const bookmarks = useAppStore((s) => s.bookmarks);
  const removeBookmark = useAppStore((s) => s.removeBookmark);
  const books = useLibraryStore((s) => s.books);
  const [colorFilter, setColorFilter] = useState(null);

  const filtered = colorFilter
    ? bookmarks.filter((b) => b.color === colorFilter)
    : bookmarks;
  const groups = groupBookmarksByBook(filtered, books);

  function handleBookmarkTap(bm) {
    router.push(`/reader?id=${bm.bookId}&ch=${bm.chapterIndex}&s=${bm.sentenceIndex}`);
  }

  return (
    <div className="min-h-screen px-4 pt-6" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <h1
        className="text-2xl font-semibold mb-4"
        style={{ fontFamily: 'var(--font-lora)' }}
      >
        Dấu trang
      </h1>

      {/* Color filter chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {FILTER_COLORS.map(({ key, label, hex }) => (
          <button
            key={label}
            onClick={() => setColorFilter(key)}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
            style={{
              backgroundColor: colorFilter === key ? (hex || 'var(--accent)') : 'var(--surface)',
              color: colorFilter === key ? (hex ? '#000' : '#fff') : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Bookmark size={40} style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>
            {colorFilter
              ? `Chưa có dấu trang màu ${FILTER_COLORS.find((c) => c.key === colorFilter)?.label}`
              : 'Chưa có dấu trang nào'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Nhấn giữ câu văn trong sách để đánh dấu
          </p>
        </div>
      ) : (
        <div className="space-y-6 pb-20">
          {groups.map(({ book, items }) => (
            <div key={book.id}>
              <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                {book.title}
              </h2>
              <div className="space-y-2">
                {items.map((bm, i) => {
                  const borderColor = bm.color ? COLOR_HEX[bm.color] : '#e91e63';
                  return (
                    <div key={i} className="relative">
                      <button
                        onClick={() => handleBookmarkTap(bm)}
                        className="w-full text-left p-3 rounded-xl transition-colors duration-200"
                        style={{
                          backgroundColor: 'var(--surface)',
                          borderLeft: `3px solid ${borderColor}`,
                        }}
                      >
                        <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                          Chương {bm.chapterIndex + 1}
                        </p>
                        <p
                          className="text-sm"
                          style={{
                            color: 'var(--text)',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {bm.text}
                        </p>
                        {bm.note && (
                          <p
                            className="text-xs mt-1 italic"
                            style={{
                              color: 'var(--text-muted)',
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            📝 {bm.note}
                          </p>
                        )}
                      </button>
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBookmark(bm);
                        }}
                        className="absolute top-2 right-2 text-xs p-1 rounded"
                        style={{ color: 'var(--text-muted)' }}
                        aria-label="Xóa dấu trang"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
