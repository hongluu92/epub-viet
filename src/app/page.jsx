'use client';

import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useLibraryStore } from '@/lib/stores/library-store';
import UploadModal from '@/components/upload-modal';
import HomeHeader from '@/components/home/home-header';
import BookSection from '@/components/home/book-section';
import GenreChips from '@/components/home/genre-chips';

export default function HomePage() {
  const { books, isLoading, loadBooks } = useLibraryStore();
  const [showUpload, setShowUpload] = useState(false);
  const [activeGenre, setActiveGenre] = useState('Tat ca');

  useEffect(() => { loadBooks(); }, [loadBooks]);

  // Books currently being read (have progress), sorted by last read
  const readingBooks = books
    .filter((b) => b.readingProgress > 0)
    .sort((a, b) => (b.lastReadAt ?? 0) - (a.lastReadAt ?? 0));

  const isEmpty = books.length === 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <HomeHeader onImport={() => setShowUpload(true)} />

      <GenreChips activeGenre={activeGenre} onGenreChange={setActiveGenre} />

      {isLoading ? (
        <p className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
          Dang tai...
        </p>
      ) : isEmpty ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 gap-4 px-4">
          <BookOpen size={48} style={{ color: 'var(--text-muted)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
            Chua co sach nao
          </p>
          <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
            Nhan nut + de them sach EPUB vao thu vien
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="px-6 py-2.5 rounded-full text-sm font-medium text-white mt-2"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Import sach
          </button>
        </div>
      ) : (
        <>
          {readingBooks.length > 0 && (
            <BookSection title="Dang doc" books={readingBooks} showViewAll />
          )}
        </>
      )}

      <UploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  );
}
