'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';
import { useLibraryStore } from '@/lib/stores/library-store';
import { prefetchOnnxRuntime } from '@/lib/utils/prefetch-onnx';
import { useEpubUpload } from '@/components/upload-modal';
import { HomeHeader, BookCard, GenreChips } from '@/components/home';
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
  const [browsePage, setBrowsePage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const sentinelRef = useRef(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => { loadBooks(); }, [loadBooks]);

  // Prefetch ONNX runtime while user browses home — cached before reader page loads
  useEffect(() => { prefetchOnnxRuntime(); }, []);

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

  // Reset and fetch page 1 when genre changes
  useEffect(() => {
    const slug = GENRE_SLUG_MAP[activeGenre];
    if (!slug) return;

    setBrowseBooks([]);
    setBrowsePage(1);
    setHasMore(true);
    setBrowseLoading(true);
    fetchBooksByGenre(slug, 1)
      .then((books) => {
        setBrowseBooks(books);
        if (books.length === 0) setHasMore(false);
      })
      .catch(() => setBrowseBooks([]))
      .finally(() => setBrowseLoading(false));
  }, [activeGenre]);

  // Load next page
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const slug = GENRE_SLUG_MAP[activeGenre];
    if (!slug) return;

    const nextPage = browsePage + 1;
    setLoadingMore(true);
    try {
      const newBooks = await fetchBooksByGenre(slug, nextPage);
      if (newBooks.length === 0) {
        setHasMore(false);
      } else {
        setBrowseBooks((prev) => {
          const ids = new Set(prev.map((b) => b.id));
          return [...prev, ...newBooks.filter((b) => !ids.has(b.id))];
        });
        setBrowsePage(nextPage);
      }
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, activeGenre, browsePage]);

  // IntersectionObserver for infinite scroll
  // Re-attach when loadMore changes or when sentinel appears (browseBooks populated)
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, browseBooks.length]);

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
      <HomeHeader onImport={() => triggerUpload()} />

      {/* My Library section - always shown first */}
      <section className="mb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
            Tủ sách của tôi
          </h2>
        </div>
        {!isLoading && books.length > 0 ? (
          <div
            className="flex gap-3 px-4 pb-2 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            {books.map((book) => (
              <BookCard key={book.id} book={book} onDelete={(b) => removeBook(b.id)} />
            ))}
          </div>
        ) : !isLoading ? (
          <p className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Chưa có sách nào. Tải sách từ Kho sách bên dưới để bắt đầu đọc!
          </p>
        ) : null}
      </section>

      {/* Divider */}
      <div className="px-4 mb-4">
        <hr style={{ borderColor: 'var(--border, #333)' }} />
      </div>

      {/* Book Store section */}
      <section className="mb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
            Kho sách
          </h2>
        </div>

        {/* Search input */}
        <div className="relative px-4 mb-3">
          <Search
            size={16}
            className="absolute left-7 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm sách trên timsach.vn..."
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          />
        </div>

        {isSearching ? (
          /* Search results */
          searchLoading ? (
            <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Đang tìm...
            </p>
          ) : searchResults.length === 0 ? (
            <p className="px-4 py-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Không tìm thấy sách
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
          )
        ) : (
          /* Genre browse */
          <>
            <GenreChips activeGenre={activeGenre} onGenreChange={setActiveGenre} />

            {browseLoading ? (
              <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Đang tải sách...
              </p>
            ) : browseBooks.length === 0 ? (
              <p className="px-4 py-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Không tìm thấy sách
              </p>
            ) : (
              <>
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
                {/* Infinite scroll sentinel */}
                {hasMore && (
                  <div ref={sentinelRef} className="px-4 py-4 text-center">
                    {loadingMore && (
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Đang tải thêm...
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>

      <UploadProgress />
    </div>
  );
}
