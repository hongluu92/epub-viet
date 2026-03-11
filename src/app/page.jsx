'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { useLibraryStore } from '@/lib/stores/library-store';
import { prefetchOnnxRuntime } from '@/lib/utils/prefetch-onnx';
import { useEpubUpload } from '@/components/upload-modal';
import { HomeHeader, BookCard, GenreChips } from '@/components/home';
import { BookShelfSkeleton } from '@/components/loading-skeleton';
import { useAuth } from '@/hooks/use-auth';
import { syncBookMetadata, deleteBookFromCloud } from '@/lib/services/firebase-sync-service';
import {
  GENRE_SLUG_MAP, fetchBooksByGenre, downloadAndImportEpub, searchBooks,
} from '@/lib/services/timsach-service';

const firstGenre = Object.keys(GENRE_SLUG_MAP)[0];

export default function HomePage() {
  const { books, isLoading, loadBooks } = useLibraryStore();
  const addBookToStore = useLibraryStore((s) => s.addBook);
  const removeBook = useLibraryStore((s) => s.removeBook);
  const { triggerUpload, UploadProgress } = useEpubUpload();
  const { user } = useAuth();
  const router = useRouter();
  const [activeGenre, setActiveGenre] = useState(firstGenre);

  // Download status toast
  const [downloadStatus, setDownloadStatus] = useState(null); // { title, message }

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

  // Prefetch reader route JS bundle so book opens instantly
  useEffect(() => { router.prefetch('/reader'); }, [router]);

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

  // Auto-download from timsach and navigate to reader.
  // If book already exists locally (matched by timsachId), skip download.
  const handleDownloadAndRead = useCallback(async (book) => {
    if (downloadingId) return;
    // Check if already downloaded locally
    const existing = books.find(
      (b) => b.epubAvailable !== false && (b.timsachId === book.id || b.id === book.id)
    );
    if (existing) {
      router.push(`/reader?id=${existing.id}`);
      return;
    }
    setDownloadingId(book.id);
    const source = book.epubUrl ? 'đường dẫn đã lưu' : 'timsach.vn';
    setDownloadStatus({ title: book.title, message: `Đang tải từ ${source}...` });
    try {
      const metadata = await downloadAndImportEpub(book);
      addBookToStore(metadata);
      if (user?.uid) syncBookMetadata(user.uid, metadata);
      setDownloadStatus(null);
      router.push(`/reader?id=${metadata.id}`);
    } catch (err) {
      console.error('Download failed:', err);
      setDownloadStatus({ title: book.title, message: 'Tải thất bại. Thử lại sau.' });
      setTimeout(() => setDownloadStatus(null), 3000);
    } finally {
      setDownloadingId(null);
    }
  }, [downloadingId, addBookToStore, user, router, books]);

  const isSearching = searchQuery.trim().length >= 2;
  // Split local books (have epub) from cloud-only (need re-download)
  const localBooks = books.filter((b) => b.epubAvailable !== false);
  const cloudOnlyBooks = books.filter((b) => b.epubAvailable === false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <HomeHeader onImport={() => triggerUpload()} />

      {/* My Library section - horizontal scroll preview */}
      <section className="mb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
            Tủ sách của tôi
          </h2>
          {(localBooks.length > 0 || cloudOnlyBooks.length > 0) && (
            <Link href="/library" className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              Xem thêm
            </Link>
          )}
        </div>
        {isLoading ? (
          <BookShelfSkeleton count={3} />
        ) : (localBooks.length > 0 || cloudOnlyBooks.length > 0) ? (
          <div
            className="flex gap-3 px-4 pb-2 overflow-x-auto flex-nowrap"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {localBooks.map((book) => (
              <BookCard key={book.id} book={book} onContextDelete={(b) => {
                removeBook(b.id);
                if (user?.uid) deleteBookFromCloud(user.uid, b.id);
              }} />
            ))}
            {cloudOnlyBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onClick={book.epubUrl ? handleDownloadAndRead : undefined}
              />
            ))}
          </div>
        ) : (
          <p className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Chưa có sách nào. Tải sách từ Kho sách bên dưới để bắt đầu đọc!
          </p>
        )}
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
                  onClick={handleDownloadAndRead}
                />
              ))}
            </div>
          )
        ) : (
          /* Genre browse */
          <>
            <GenreChips activeGenre={activeGenre} onGenreChange={setActiveGenre} />

            {browseLoading ? (
              <BookShelfSkeleton count={5} />
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
                      onClick={handleDownloadAndRead}
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

      {/* Download status toast */}
      {downloadStatus && (
        <div
          className="fixed left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg z-50 max-w-[90vw]"
          style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Loader2 size={18} className="animate-spin flex-shrink-0" style={{ color: 'var(--accent)' }} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
              {downloadStatus.title}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {downloadStatus.message}
            </p>
          </div>
        </div>
      )}

      <UploadProgress />
    </div>
  );
}
