// Hook for loading, caching, and navigating parsed EPUB books
// Fetches EPUB blob from a URL, parses via parseEpub(), caches in Zustand store
import { useState, useCallback } from 'react';
import { parseEpub } from '../services/epub-parser.js';
import useAppStore from '../store/app-store.js';

/**
 * useBook — manages current book state and chapter navigation.
 *
 * @returns {{
 *   book: object|null,
 *   currentChapter: object|null,
 *   chapterIdx: number,
 *   loading: boolean,
 *   error: string|null,
 *   loadBook: (bookId: string, downloadUrl: string) => Promise<void>,
 *   loadBookFromFile: (file: File) => Promise<void>,
 *   navigateChapter: (idx: number) => void,
 * }}
 */
export function useBook() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const parsedBook = useAppStore((s) => s.parsedBook);
  const chapterIdx = useAppStore((s) => s.chapterIdx);
  const setParsedBook = useAppStore((s) => s.setParsedBook);
  const setChapterIdx = useAppStore((s) => s.setChapterIdx);
  const updateTts = useAppStore((s) => s.updateTts);

  /**
   * Load and parse an EPUB from a remote download URL.
   * Skips parsing if the same bookId is already cached in store.
   */
  const loadBook = useCallback(
    async (bookId, downloadUrl) => {
      // Return cached book if already loaded
      if (parsedBook && parsedBook._bookId === bookId) return;

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error(`Failed to fetch EPUB: ${response.status}`);
        const blob = await response.blob();
        const parsed = await parseEpub(blob);
        setParsedBook({ ...parsed, _bookId: bookId });
        setChapterIdx(0);
        updateTts({ currentSentenceIdx: 0 });
      } catch (err) {
        setError(err.message || 'Failed to load book');
        console.error('[useBook] loadBook error:', err);
      } finally {
        setLoading(false);
      }
    },
    [parsedBook, setParsedBook, setChapterIdx, updateTts],
  );

  /**
   * Load and parse an EPUB directly from a File object (upload flow).
   * Always re-parses since file objects are transient.
   */
  const loadBookFromFile = useCallback(
    async (file) => {
      setLoading(true);
      setError(null);
      try {
        const parsed = await parseEpub(file);
        setParsedBook({ ...parsed, _bookId: null });
        setChapterIdx(0);
        updateTts({ currentSentenceIdx: 0 });
      } catch (err) {
        setError(err.message || 'Failed to parse EPUB');
        console.error('[useBook] loadBookFromFile error:', err);
      } finally {
        setLoading(false);
      }
    },
    [setParsedBook, setChapterIdx, updateTts],
  );

  /**
   * Navigate to a chapter by index; resets sentence position.
   */
  const navigateChapter = useCallback(
    (idx) => {
      if (!parsedBook) return;
      const clamped = Math.max(0, Math.min(idx, parsedBook.chapters.length - 1));
      setChapterIdx(clamped);
      updateTts({ currentSentenceIdx: 0 });
    },
    [parsedBook, setChapterIdx, updateTts],
  );

  const currentChapter = parsedBook?.chapters?.[chapterIdx] ?? null;

  return {
    book: parsedBook,
    currentChapter,
    chapterIdx,
    loading,
    error,
    loadBook,
    loadBookFromFile,
    navigateChapter,
  };
}
