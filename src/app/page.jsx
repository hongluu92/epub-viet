'use client';

import { useEffect, useState } from 'react';
import { useLibraryStore } from '@/lib/stores/library-store';
import UploadModal from '@/components/upload-modal';
import Link from 'next/link';

export default function HomePage() {
  const { books, isLoading, loadBooks } = useLibraryStore();
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: 'var(--font-lora)' }}
          >
            ReadFlow
          </h1>
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            + Import
          </button>
        </div>

        {/* Book list */}
        {isLoading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
        ) : books.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg mb-2" style={{ color: 'var(--text-secondary)' }}>
              No books yet
            </p>
            <p style={{ color: 'var(--text-muted)' }}>
              Tap &quot;Import&quot; to add an EPUB file
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/reader/${book.id}`}
                className="flex gap-4 p-3 rounded-xl transition-colors"
                style={{ backgroundColor: 'var(--surface)' }}
              >
                {/* Cover thumbnail */}
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt=""
                    className="w-14 h-20 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-14 h-20 rounded flex-shrink-0 flex items-center justify-center text-xs"
                    style={{ backgroundColor: 'var(--border)', color: 'var(--text-muted)' }}
                  >
                    EPUB
                  </div>
                )}

                {/* Book info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{book.title}</h3>
                  <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                    {book.author}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {book.chapterCount} chapters
                    {book.readingProgress > 0 &&
                      ` · ${Math.round(book.readingProgress * 100)}%`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <UploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  );
}
