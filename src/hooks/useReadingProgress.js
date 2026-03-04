// Reading progress hook — loads from Firestore on mount, debounced save on change
import { useEffect, useRef, useCallback, useState } from 'react';
import { getProgress, updateProgressDebounced } from '../services/sync-service.js';
import useAppStore from '../store/app-store.js';

const DEFAULT_PROGRESS = { chapterIdx: 0, sentenceIdx: 0, scrollPos: 0 };

export default function useReadingProgress(bookId) {
  const { user } = useAppStore();
  const uid = user?.uid ?? null;
  const [progress, setProgress] = useState(DEFAULT_PROGRESS);
  const loadedRef = useRef(false);

  // Load progress from Firestore (or localStorage for guest) on mount / bookId change
  useEffect(() => {
    if (!bookId) return;
    loadedRef.current = false;

    let cancelled = false;
    async function load() {
      try {
        const saved = await getProgress(uid, bookId);
        if (!cancelled && saved) {
          setProgress({
            chapterIdx: saved.chapterIdx ?? 0,
            sentenceIdx: saved.sentenceIdx ?? 0,
            scrollPos: saved.scrollPos ?? 0,
          });
        }
      } catch (err) {
        console.error('[useReadingProgress] load error:', err);
      } finally {
        loadedRef.current = true;
      }
    }

    load();
    return () => { cancelled = true; };
  }, [bookId, uid]);

  // Update local state + trigger debounced Firestore write
  const updateProgress = useCallback(
    (patch) => {
      setProgress((prev) => {
        const next = { ...prev, ...patch };
        if (bookId) {
          updateProgressDebounced(uid, bookId, next);
        }
        return next;
      });
    },
    [bookId, uid]
  );

  return { progress, updateProgress };
}
