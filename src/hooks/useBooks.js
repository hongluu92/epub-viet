// Manages book list from Firestore/localStorage — loads, caches, and deletes books
import { useEffect, useState, useCallback } from 'react';
import {
  getBooks,
  deleteBook as syncDeleteBook,
  toggleFavorite,
  getFavorites,
} from '../services/sync-service.js';
import useAppStore from '../store/app-store.js';

/**
 * useBooks — loads and manages the book library list.
 * Syncs with Firestore (or localStorage for guests) when user changes.
 *
 * @returns {{
 *   books: object[],
 *   recentBooks: (n?: number) => object[],
 *   favorites: object[],
 *   loading: boolean,
 *   deleteBook: (bookId: string) => Promise<void>,
 *   toggleFav: (bookId: string) => Promise<void>,
 *   reload: () => Promise<void>,
 * }}
 */
export default function useBooks() {
  const { user, books, setBooks } = useAppStore();
  const uid = user?.uid ?? null;
  const [loading, setLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allBooks, favIds] = await Promise.all([
        getBooks(uid),
        getFavorites(uid),
      ]);
      setBooks(allBooks ?? []);
      setFavoriteIds(favIds ?? []);
    } catch (err) {
      console.error('[useBooks] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [uid, setBooks]);

  // Reload on user change
  useEffect(() => {
    load();
  }, [load]);

  // Returns last n books sorted by addedAt descending
  const recentBooks = useCallback(
    (n = 6) => {
      return [...books]
        .sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0))
        .slice(0, n);
    },
    [books]
  );

  // Books marked as favorite
  const favorites = books.filter((b) => favoriteIds.includes(b.bookId));

  const deleteBook = useCallback(
    async (bookId) => {
      try {
        await syncDeleteBook(uid, bookId);
        setBooks(books.filter((b) => b.bookId !== bookId));
      } catch (err) {
        console.error('[useBooks] deleteBook error:', err);
      }
    },
    [uid, books, setBooks]
  );

  const toggleFav = useCallback(
    async (bookId) => {
      try {
        const newIds = await toggleFavorite(uid, bookId);
        setFavoriteIds(newIds ?? []);
      } catch (err) {
        console.error('[useBooks] toggleFav error:', err);
      }
    },
    [uid]
  );

  return { books, recentBooks, favorites, loading, deleteBook, toggleFav, reload: load };
}
