'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as db from '@/lib/services/indexeddb-service';

export const useLibraryStore = create(
  persist(
    (set) => ({
  books: [],
  currentBook: null,
  isLoading: false,

  // Instant re-open cache — persisted to localStorage for <200ms warm open
  lastReadBook: null,
  lastReadChapter: null,
  setLastRead: (book, chapter) => set({ lastReadBook: book, lastReadChapter: chapter }),

  setBooks: (books) => set({ books }),
  setCurrentBook: (book) => set({ currentBook: book }),
  setLoading: (isLoading) => set({ isLoading }),

  /** Load all books from IndexedDB, preserving cloud-only placeholders and cloud progress */
  loadBooks: async () => {
    set({ isLoading: true });
    try {
      const localBooks = await db.getBooks();
      localBooks.sort((a, b) => (b.lastReadAt || b.addedAt || 0) - (a.lastReadAt || a.addedAt || 0));
      set((state) => {
        const localIds = new Set(localBooks.map((b) => b.id));
        // Keep cloud-only entries
        const cloudOnly = state.books.filter((b) => b.epubAvailable === false && !localIds.has(b.id));
        // Preserve cloud progress if state has a newer version (mergeCloudBooks may have run first)
        const merged = localBooks.map((lb) => {
          const inState = state.books.find((b) => b.id === lb.id);
          if (!inState) return lb;
          const stateTs = inState.lastReadAt || 0;
          const localTs = lb.lastReadAt || 0;
          if (stateTs <= localTs) return lb;
          return {
            ...lb,
            currentChapter: inState.currentChapter ?? lb.currentChapter,
            scrollProgress: inState.scrollProgress ?? lb.scrollProgress,
            readingProgress: inState.readingProgress ?? lb.readingProgress,
            lastReadAt: inState.lastReadAt,
          };
        });
        return { books: [...merged, ...cloudOnly], isLoading: false };
      });
    } catch {
      set({ isLoading: false });
    }
  },

  /** Add book to store (IndexedDB save happens in upload-modal) */
  addBook: (book) => set((state) => {
    // Replace cloud-only placeholder if this book was already synced from cloud
    const filtered = state.books.filter((b) => b.id !== book.id);
    return { books: [...filtered, { ...book, epubAvailable: true }] };
  }),

  /** Merge cloud books: update progress for existing local books if cloud is newer,
   *  and add cloud-only books as downloadable placeholders */
  mergeCloudBooks: (cloudBooks) => set((state) => {
    const localIds = new Set(state.books.map((b) => b.id));

    // Update progress for existing local books when cloud version is newer
    const updatedBooks = state.books.map((b) => {
      const cloud = cloudBooks.find((cb) => cb.id === b.id);
      if (!cloud) return b;
      // Firestore Timestamp has toMillis(), plain number also works
      const cloudTs = cloud.updatedAt?.toMillis?.() || cloud.updatedAt || 0;
      const localTs = b.lastReadAt || 0;
      if (cloudTs <= localTs) return b;
      return {
        ...b,
        currentChapter: cloud.currentChapter ?? b.currentChapter,
        scrollProgress: cloud.scrollProgress ?? b.scrollProgress,
        readingProgress: cloud.readingProgress ?? b.readingProgress,
        lastReadAt: cloud.lastReadAt || b.lastReadAt,
      };
    });

    // Add books that only exist in cloud (not downloaded locally)
    const cloudOnly = cloudBooks
      .filter((cb) => !localIds.has(cb.id))
      .map((cb) => ({ ...cb, epubAvailable: false }));

    return { books: [...updatedBooks, ...cloudOnly] };
  }),

  /** Remove book from IndexedDB, store, and optionally cloud */
  removeBook: async (bookId) => {
    await db.deleteBook(bookId);
    set((state) => ({
      books: state.books.filter((b) => b.id !== bookId),
      currentBook: state.currentBook?.id === bookId ? null : state.currentBook,
    }));
  },

  /** Update reading progress in both store and IndexedDB */
  updateBookProgress: async (bookId, progress) => {
    await db.updateReadingProgress(bookId, progress);
    set((state) => ({
      books: state.books.map((b) =>
        b.id === bookId ? { ...b, ...progress, lastReadAt: Date.now() } : b
      ),
    }));
  },
}),
    {
      name: 'readflow-library',
      // Only persist last-read cache (not full book list — that comes from IndexedDB).
      // Strip chapter content to avoid localStorage quota (~5MB on mobile).
      // Full chapter loads from IndexedDB in ~50ms on cold path.
      partialize: (state) => ({
        lastReadBook: state.lastReadBook,
        lastReadChapter: state.lastReadChapter
          ? { chapterIndex: state.lastReadChapter.chapterIndex, title: state.lastReadChapter.title, bookId: state.lastReadChapter.bookId }
          : null,
      }),
    }
  )
);
