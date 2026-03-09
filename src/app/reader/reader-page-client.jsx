'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { getBook, getChapter, getChapterTitlesByBook } from '@/lib/services/indexeddb-service';
import { useLibraryStore } from '@/lib/stores/library-store';
import { useTts } from '@/hooks/use-tts';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { isModelCached, downloadModel } from '@/lib/services/tts-model-loader';
import { useTtsStore } from '@/lib/stores/tts-store';
import ReaderHeader from '@/components/reader/reader-header';
import ReadingProgressBar from '@/components/reader/reading-progress-bar';
import SettingsDropdown from '@/components/reader/settings-dropdown';
import ReaderContent from '@/components/reader/reader-content';
import BookmarkPopup from '@/components/reader/bookmark-popup';
import TtsBar from '@/components/reader/tts-bar';

const SAVE_PROGRESS_DEBOUNCE_MS = 800;

export default function ReaderPageClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [book, setBook] = useState(null);
  const [chapterMeta, setChapterMeta] = useState([]); // titles only
  const [loadedChapters, setLoadedChapters] = useState([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [popupData, setPopupData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateBookProgress = useLibraryStore((s) => s.updateBookProgress);
  const { play, pause, resume, stop: stopTts, warmup, dispose: disposeTts } = useTts();
  const autoPlayChapterRef = useRef(null);
  const saveTimerRef = useRef(null);
  const latestBookRef = useRef(null);
  const latestChapterRef = useRef(0);
  const latestScrollRef = useRef(0);
  // Holds latest TTS playback context for keyboard shortcut callbacks
  const ttsContextRef = useRef({ flatSentences: [], sentenceMap: [], playStartIndex: 0 });

  const getOverallReadingProgress = useCallback((chapterIndex, localScroll, chapterCount) => {
    if (!chapterCount) return 0;
    const clampedLocal = Math.min(1, Math.max(0, localScroll || 0));
    return Math.min(1, Math.max(0, (chapterIndex + clampedLocal) / chapterCount));
  }, []);

  const persistReadingPosition = useCallback((targetBook, chapterIndex, localScroll) => {
    if (!targetBook?.id) return;
    void updateBookProgress(targetBook.id, {
      currentChapter: chapterIndex,
      scrollProgress: Math.min(1, Math.max(0, localScroll || 0)),
      readingProgress: getOverallReadingProgress(chapterIndex, localScroll, targetBook.chapterCount),
    });
  }, [updateBookProgress, getOverallReadingProgress]);

  useEffect(() => {
    latestBookRef.current = book;
  }, [book]);

  useEffect(() => {
    latestChapterRef.current = currentChapterIndex;
  }, [currentChapterIndex]);

  useEffect(() => {
    latestScrollRef.current = scrollProgress;
  }, [scrollProgress]);

  // Load book and first chapter
  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        const bookData = await getBook(id);
        if (!bookData) return;
        setBook(bookData);
        setCurrentChapterIndex(bookData.currentChapter || 0);
        setScrollProgress(bookData.scrollProgress || 0);

        // Get chapter titles only (lightweight — skips full content)
        const titles = await getChapterTitlesByBook(id);
        titles.sort((a, b) => a.chapterIndex - b.chapterIndex);
        setChapterMeta(titles);

        // Load starting chapter
        const startIdx = bookData.currentChapter || 0;
        const firstChapter = await getChapter(id, startIdx);
        if (firstChapter) {
          setLoadedChapters([firstChapter]);
        }
      } catch (err) {
        console.error('Failed to load book:', err);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [id]);

  // Download TTS model to IndexedDB in background (if not cached)
  const setModelLoading = useTtsStore((s) => s.setModelLoading);
  const setModelProgress = useTtsStore((s) => s.setModelProgress);
  const setModelLoaded = useTtsStore((s) => s.setModelLoaded);
  const modelLoaded = useTtsStore((s) => s.modelLoaded);
  const isPlaying = useTtsStore((s) => s.isPlaying);
  const isPaused = useTtsStore((s) => s.isPaused);
  const currentFlatIndex = useTtsStore((s) => s.currentFlatIndex);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (await isModelCached()) {
        setModelLoaded(true);
        return;
      }
      setModelLoading(true);
      try {
        await downloadModel((p) => { if (!cancelled) setModelProgress(p); });
        if (!cancelled) setModelLoaded(true);
      } catch (err) {
        console.error('[TTS] Model download failed:', err);
      } finally {
        if (!cancelled) setModelLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [setModelLoading, setModelProgress, setModelLoaded]);

  // Warmup deferred to first play — avoids blocking page load with heavy
  // ONNX session init + phonemizer worker when user may just want to read.

  // Stop TTS when leaving the reader page
  useEffect(() => {
    return () => {
      clearTimeout(saveTimerRef.current);
      persistReadingPosition(
        latestBookRef.current,
        latestChapterRef.current,
        latestScrollRef.current
      );
      disposeTts();
    };
  }, [disposeTts, persistReadingPosition]);

  // Load next chapter for infinite scroll
  const loadNextChapter = useCallback(async () => {
    if (!book || loadedChapters.length === 0) return;
    const lastLoaded = loadedChapters[loadedChapters.length - 1];
    const nextIdx = lastLoaded.chapterIndex + 1;

    if (nextIdx >= book.chapterCount) return;

    const nextChapter = await getChapter(book.id, nextIdx);
    if (nextChapter) {
      setLoadedChapters((prev) => {
        // Avoid duplicate chapters
        if (prev.some((c) => c.chapterIndex === nextChapter.chapterIndex)) return prev;
        return [...prev, nextChapter];
      });
    }
  }, [book, loadedChapters]);

  // Jump to chapter — stop TTS and clear state first
  const handleChapterSelect = useCallback(async (index) => {
    if (!book) return;
    stopTts();
    const chapter = await getChapter(book.id, index);
    if (chapter) {
      setLoadedChapters([chapter]);
      setCurrentChapterIndex(index);
      setScrollProgress(0);
      updateBookProgress(book.id, {
        currentChapter: index,
        scrollProgress: 0,
        readingProgress: getOverallReadingProgress(index, 0, book.chapterCount),
      });
    }
  }, [book, updateBookProgress, stopTts, getOverallReadingProgress]);

  // Update current chapter when scrolling through chapters
  const handleVisibleChapterChange = useCallback((chapterIndex) => {
    setCurrentChapterIndex(chapterIndex);
    if (book) {
      updateBookProgress(book.id, {
        currentChapter: chapterIndex,
        scrollProgress,
        readingProgress: getOverallReadingProgress(chapterIndex, scrollProgress, book.chapterCount),
      });
    }
  }, [book, updateBookProgress, scrollProgress, getOverallReadingProgress]);

  // Save progress on scroll
  const handleScrollProgress = useCallback((progress) => {
    setScrollProgress(progress);
    if (!book) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistReadingPosition(book, latestChapterRef.current, progress);
    }, SAVE_PROGRESS_DEBOUNCE_MS);
  }, [book, persistReadingPosition]);

  // Change chapter from TtsBar — stop TTS, clear state, load new chapter, auto-play
  const changeTtsChapter = useCallback(async (index, { stopFirst = true, autoPlay = false } = {}) => {
    if (!book) return;
    if (index < 0 || index >= book.chapterCount) return;
    if (stopFirst) stopTts();
    const chapter = await getChapter(book.id, index);
    if (!chapter) return;

    setLoadedChapters([chapter]);
    setCurrentChapterIndex(index);
    setScrollProgress(0);
    updateBookProgress(book.id, {
      currentChapter: index,
      scrollProgress: 0,
      readingProgress: getOverallReadingProgress(index, 0, book.chapterCount),
    });

    if (autoPlay) {
      // Mark for auto-play after state updates
      autoPlayChapterRef.current = index;
    }
  }, [book, updateBookProgress, stopTts, getOverallReadingProgress]);

  const handleTtsChapterChange = useCallback(async (index) => {
    await changeTtsChapter(index, { stopFirst: true, autoPlay: true });
  }, [changeTtsChapter]);

  const handleTtsPlayComplete = useCallback(async ({ reason, chapterIdx: finishedChapter }) => {
    if (reason !== 'finished' || !book) return;
    const nextChapter = finishedChapter + 1;
    if (nextChapter >= book.chapterCount) return;
    await changeTtsChapter(nextChapter, { stopFirst: false, autoPlay: true });
  }, [book, changeTtsChapter]);

  const playWithAutoAdvance = useCallback((sentences, startIdx = 0, chapterIdx = 0, map = []) => {
    return play(sentences, startIdx, chapterIdx, map, {
      onComplete: (result) => {
        void handleTtsPlayComplete(result);
      },
    });
  }, [play, handleTtsPlayComplete]);

  // Auto-play first sentence when chapter changes via TtsBar
  useEffect(() => {
    if (autoPlayChapterRef.current === null) return;
    if (autoPlayChapterRef.current !== currentChapterIndex) return;

    const chapter = loadedChapters.find((c) => c.chapterIndex === currentChapterIndex);
    if (!chapter) return;

    // Build flat sentences + map for the new chapter
    let flat, map;
    if (chapter.sentences) {
      flat = [];
      map = [];
      chapter.sentences.forEach((paraSentences, pIdx) => {
        paraSentences.forEach((sentence, sIdx) => {
          flat.push(sentence);
          map.push({ paragraphIndex: pIdx, sentenceIndex: sIdx });
        });
      });
    } else {
      const paragraphs = chapter.paragraphs || [];
      flat = paragraphs;
      map = paragraphs.map((_, i) => ({ paragraphIndex: i, sentenceIndex: 0 }));
    }

    if (flat.length > 0) {
      playWithAutoAdvance(flat, 0, currentChapterIndex, map);
    }

    autoPlayChapterRef.current = null;
  }, [loadedChapters, currentChapterIndex, playWithAutoAdvance]);

  // Keyboard shortcut callbacks — use ttsContextRef to avoid stale closures
  // (flatSentences/sentenceMap are computed after early returns, so we store latest in a ref)
  useKeyboardShortcuts({
    enabled: !isLoading && !!book,
    onPlayPause: useCallback(() => {
      const { flatSentences: fs, sentenceMap: sm, playStartIndex: psi } = ttsContextRef.current;
      if (isPlaying) {
        pause();
      } else if (isPaused) {
        resume();
      } else if (fs.length > 0) {
        playWithAutoAdvance(fs, psi, latestChapterRef.current, sm);
      }
    }, [isPlaying, isPaused, pause, resume, playWithAutoAdvance]),
    onPrevSentence: useCallback(() => {
      if (!isPlaying && !isPaused) return;
      const { flatSentences: fs, sentenceMap: sm } = ttsContextRef.current;
      const prevIdx = Math.max(0, currentFlatIndex - 1);
      stopTts();
      if (fs.length > 0) playWithAutoAdvance(fs, prevIdx, latestChapterRef.current, sm);
    }, [isPlaying, isPaused, currentFlatIndex, stopTts, playWithAutoAdvance]),
    onNextSentence: useCallback(() => {
      if (!isPlaying && !isPaused) return;
      const { flatSentences: fs, sentenceMap: sm } = ttsContextRef.current;
      const nextIdx = Math.min(fs.length - 1, currentFlatIndex + 1);
      stopTts();
      if (fs.length > 0) playWithAutoAdvance(fs, nextIdx, latestChapterRef.current, sm);
    }, [isPlaying, isPaused, currentFlatIndex, stopTts, playWithAutoAdvance]),
    onEscape: useCallback(() => {
      setShowSettings(false);
      setPopupData(null);
    }, []),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Book not found</p>
      </div>
    );
  }

  // Flatten sentences and build coordinate map for TTS highlighting
  const currentChapter = loadedChapters.find((c) => c.chapterIndex === currentChapterIndex);
  const { flatSentences, sentenceMap } = (() => {
    if (!currentChapter?.sentences) {
      const paragraphs = currentChapter?.paragraphs || [];
      return {
        flatSentences: paragraphs,
        sentenceMap: paragraphs.map((_, i) => ({ paragraphIndex: i, sentenceIndex: 0 })),
      };
    }
    const flat = [];
    const map = [];
    currentChapter.sentences.forEach((paraSentences, pIdx) => {
      paraSentences.forEach((sentence, sIdx) => {
        flat.push(sentence);
        map.push({ paragraphIndex: pIdx, sentenceIndex: sIdx });
      });
    });
    return { flatSentences: flat, sentenceMap: map };
  })();

  const hasMore =
    loadedChapters.length > 0 &&
    loadedChapters[loadedChapters.length - 1].chapterIndex < book.chapterCount - 1;
  const playStartIndex = flatSentences.length > 0
    ? Math.min(flatSentences.length - 1, Math.max(0, Math.floor(scrollProgress * flatSentences.length)))
    : 0;

  // Keep ref in sync so keyboard callbacks always have the latest context
  ttsContextRef.current = { flatSentences, sentenceMap, playStartIndex };

  return (
    <div className="h-dvh flex flex-col relative" style={{ backgroundColor: 'var(--bg)' }}>
      <ReaderHeader
        book={book}
        chapters={chapterMeta}
        currentChapterIndex={currentChapterIndex}
        onChapterSelect={handleChapterSelect}
        onToggleSettings={() => setShowSettings(!showSettings)}
      />

      <ReadingProgressBar progress={scrollProgress} />

      {showSettings && <SettingsDropdown onClose={() => setShowSettings(false)} />}

      <ReaderContent
        loadedChapters={loadedChapters}
        bookId={book.id}
        initialScrollProgress={scrollProgress}
        onLoadNext={loadNextChapter}
        hasMore={hasMore}
        onScrollProgress={handleScrollProgress}
        onVisibleChapterChange={handleVisibleChapterChange}
        onLongPressSentence={(data) => setPopupData(data)}
      />


      {popupData && (
        <BookmarkPopup
          sentenceData={popupData}
          bookId={book.id}
          onPlayFrom={(data) => {
            // Find flat index for the selected sentence
            const flatIdx = sentenceMap.findIndex(
              (m) => m.paragraphIndex === data.paragraphIndex && m.sentenceIndex === data.sentenceIndex
            );
            if (flatIdx >= 0) {
              stopTts();
              playWithAutoAdvance(flatSentences, flatIdx, currentChapterIndex, sentenceMap);
            }
          }}
          onClose={() => setPopupData(null)}
        />
      )}

      <TtsBar
        sentences={flatSentences}
        sentenceMap={sentenceMap}
        chapterIndex={currentChapterIndex}
        totalChapters={book.chapterCount}
        playStartIndex={playStartIndex}
        onChapterChange={handleTtsChapterChange}
        play={playWithAutoAdvance}
        pause={pause}
        resume={resume}
        stop={stopTts}
      />
    </div>
  );
}
