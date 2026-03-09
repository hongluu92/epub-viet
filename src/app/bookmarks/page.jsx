'use client';

import { useRouter } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import { useAppStore } from '@/lib/stores/app-store';
import { useLibraryStore } from '@/lib/stores/library-store';

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
  const books = useLibraryStore((s) => s.books);
  const groups = groupBookmarksByBook(bookmarks, books);

  function handleBookmarkTap(bm) {
    const params = new URLSearchParams({
      ch: bm.chapterIndex,
      s: bm.sentenceIndex,
    });
    router.push(`/reader?id=${bm.bookId}&${params}`);
  }

  return (
    <div className="min-h-screen px-4 pt-6" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <h1
        className="text-2xl font-semibold mb-6"
        style={{ fontFamily: 'var(--font-lora)' }}
      >
        Dấu trang
      </h1>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Bookmark size={40} style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Chua co Dấu trang nao</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ book, items }) => (
            <div key={book.id}>
              {/* Book title header */}
              <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                {book.title}
              </h2>
              <div className="space-y-2">
                {items.map((bm, i) => (
                  <button
                    key={i}
                    onClick={() => handleBookmarkTap(bm)}
                    className="w-full text-left p-3 rounded-xl transition-colors duration-200"
                    style={{ backgroundColor: 'var(--surface)' }}
                  >
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      Chuong {bm.chapterIndex + 1}
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
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
