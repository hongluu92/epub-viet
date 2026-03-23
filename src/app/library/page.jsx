'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useLibraryStore } from '@/lib/stores/library-store';
import { BookCard } from '@/components/home';
import { BookShelfSkeleton } from '@/components/loading-skeleton';
import { useAuth } from '@/hooks/use-auth';
import { syncBookMetadata, deleteBookFromCloud } from '@/lib/services/firebase-sync-service';
import { downloadAndImportEpub } from '@/lib/services/timsach-service';

// Full library page showing all books in a grid layout.
export default function LibraryPage() {
  const { books, isLoading, loadBooks, removeBook } = useLibraryStore();
  const addBookToStore = useLibraryStore((s) => s.addBook);
  const { user } = useAuth();
  const router = useRouter();
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState(null);

  useEffect(() => { loadBooks(); }, [loadBooks]);

  const localBooks = books.filter((b) => b.epubAvailable !== false);
  const cloudOnlyBooks = books.filter((b) => b.epubAvailable === false);

  // Download cloud-only book and navigate to reader
  const handleDownloadAndRead = useCallback(async (book) => {
    if (downloadingId) return;
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
      setDownloadStatus({ title: book.title, message: 'Tải thất bại. Kiểm tra kết nối mạng và thử lại.' });
      setTimeout(() => setDownloadStatus(null), 3000);
    } finally {
      setDownloadingId(null);
    }
  }, [downloadingId, addBookToStore, user, router]);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 backdrop-blur-md border-b"
        style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--border)' }}>
        <button onClick={() => router.back()} className="p-1" style={{ color: 'var(--text)' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
          Tủ sách của tôi
        </h1>
      </header>

      {isLoading ? (
        <div className="px-4 pt-4">
          <BookShelfSkeleton count={6} />
        </div>
      ) : (localBooks.length > 0 || cloudOnlyBooks.length > 0) ? (
        <div
          className="grid gap-4 px-4 pt-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}
        >
          {localBooks.map((book) => (
            <BookCard key={book.id} book={book} onDelete={(b) => {
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
        <p className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Chưa có sách nào.
        </p>
      )}

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
    </div>
  );
}
