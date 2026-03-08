'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useLibraryStore } from '@/lib/stores/library-store';
import { useEpubUpload } from '@/components/upload-modal';
import { HomeHeader, BookSection, BookCard, GenreChips } from '@/components/home';
import {
  GENRE_SLUG_MAP, fetchBooksByGenre, downloadAndImportEpub, searchBooks,
} from '@/lib/services/timsach-service';

const firstGenre = Object.keys(GENRE_SLUG_MAP)[0];

export default function HomePage() {
  const { books, isLoading, loadBooks, removeBook } = useLibraryStore();
  const addBookToStore = useLibraryStore((s) => s.addBook);
  const { triggerUpload, UploadProgress } = useEpubUpload();
  const [activeGenre, setActiveGenre] = useState(firstGenre);

  // Timsach browse state
  const [browseBooks, setBrowseBooks] = useState([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => { loadBooks(); }, [loadBooks]);

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    searchTimer.current = setTimeout(() => {
      searchBooks(searchQuery.trim())
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 500);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery]);

  // Fetch timsach books when genre changes
  useEffect(() => {
    const slug = GENRE_SLUG_MAP[activeGenre];
    if (!slug) return;

    setBrowseLoading(true);
    fetchBooksByGenre(slug)
      .then(setBrowseBooks)
      .catch(() => setBrowseBooks([]))
      .finally(() => setBrowseLoading(false));
  }, [activeGenre]);

  // Download and import a timsach book
  const handleDownload = useCallback(async (book) => {
    if (downloadingId) return;
    setDownloadingId(book.id);
    try {
      const metadata = await downloadAndImportEpub(book);
      addBookToStore(metadata);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingId(null);
    }
  }, [downloadingId, addBookToStore]);

  const isSearching = searchQuery.trim().length >= 2;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <HomeHeader
        onImport={() => triggerUpload()}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {isSearching ? (
        /* Search results */
        <section className="mb-6">
          <div className="px-4 mb-3">
            <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
              Ket qua tim kiem
            </h2>
          </div>
          {searchLoading ? (
            <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Dang tim...
            </p>
          ) : searchResults.length === 0 ? (
            <p className="px-4 py-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Khong tim thay sach
            </p>
          ) : (
            <div
              className="flex gap-3 px-4 pb-2 overflow-x-auto flex-wrap"
              style={{ scrollbarWidth: 'none' }}
            >
              {searchResults.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onDownload={handleDownload}
                  isDownloading={downloadingId === book.id}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <GenreChips activeGenre={activeGenre} onGenreChange={setActiveGenre} />

          {/* Library section */}
          {!isLoading && books.length > 0 && (
            <BookSection
              title="Tu sach"
              books={books}
              showViewAll
              onDelete={(book) => removeBook(book.id)}
            />
          )}

          {/* Timsach browse section */}
          <section className="mb-6">
            <div className="flex items-center justify-between px-4 mb-3">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
                {activeGenre}
              </h2>
            </div>

            {browseLoading ? (
              <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Dang tai sach...
              </p>
            ) : browseBooks.length === 0 ? (
              <p className="px-4 py-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Khong tim thay sach
              </p>
            ) : (
              <div
                className="flex gap-3 px-4 pb-2 overflow-x-auto flex-wrap"
                style={{ scrollbarWidth: 'none' }}
              >
                {browseBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onDownload={handleDownload}
                    isDownloading={downloadingId === book.id}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <UploadProgress />
    </div>
  );
}
