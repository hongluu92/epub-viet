'use client';

import { create } from 'zustand';
import * as db from '@/lib/services/indexeddb-service';

export const useLibraryStore = create((set) => ({
  books: [],
  currentBook: null,
  isLoading: false,

  setBooks: (books) => set({ books }),
  setCurrentBook: (book) => set({ currentBook: book }),
  setLoading: (isLoading) => set({ isLoading }),

  /** Load all books from IndexedDB */
  loadBooks: async () => {
    set({ isLoading: true });
    try {
      const books = await db.getBooks();
      set({ books, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  /** Add book to store (IndexedDB save happens in upload-modal) */
  addBook: (book) => set((state) => ({ books: [...state.books, book] })),

  /** Remove book from IndexedDB and store */
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
}));
