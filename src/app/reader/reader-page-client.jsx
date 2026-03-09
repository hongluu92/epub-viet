'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { getBook, getChapter, getChaptersByBook } from '@/lib/services/indexeddb-service';
import { useLibraryStore } from '@/lib/stores/library-store';
import { useTts } from '@/hooks/use-tts';
import { isModelCached, downloadModel } from '@/lib/services/tts-model-loader';
import { useTtsStore } from '@/lib/stores/tts-store';
import ReaderHeader from '@/components/reader/reader-header';
import ReadingProgressBar from '@/components/reader/reading-progress-bar';
import SettingsDropdown from '@/components/reader/settings-dropdown';
import ReaderContent from '@/components/reader/reader-content';
import BookmarkPopup from '@/components/reader/bookmark-popup';
import TtsBar from '@/components/reader/tts-bar';

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

  // Load book and first chapter
  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        const bookData = await getBook(id);
        if (!bookData) return;
        setBook(bookData);
        setCurrentChapterIndex(bookData.currentChapter || 0);

        // Get all chapters for metadata (titles)
        const allChapters = await getChaptersByBook(id);
        allChapters.sort((a, b) => a.chapterIndex - b.chapterIndex);
        setChapterMeta(allChapters.map((c) => ({ title: c.title, chapterIndex: c.chapterIndex })));

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

  // Warm up phonemizer/inference when model is ready to reduce first-play pause.
  useEffect(() => {
    if (!modelLoaded) return;
    void warmup();
  }, [modelLoaded, warmup]);

  // Stop TTS when leaving the reader page
  useEffect(() => {
    return () => disposeTts();
  }, [disposeTts]);

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
      updateBookProgress(book.id, { currentChapter: index, readingProgress: index / book.chapterCount });
    }
  }, [book, updateBookProgress, stopTts]);

  // Update current chapter when scrolling through chapters
  const handleVisibleChapterChange = useCallback((chapterIndex) => {
    setCurrentChapterIndex(chapterIndex);
    if (book) {
      updateBookProgress(book.id, {
        currentChapter: chapterIndex,
        readingProgress: chapterIndex / (book.chapterCount || 1),
      });
    }
  }, [book, updateBookProgress]);

  // Save progress on scroll
  const handleScrollProgress = useCallback((progress) => {
    setScrollProgress(progress);
  }, []);

  // Change chapter from TtsBar — stop TTS, clear state, load new chapter, auto-play
  const handleTtsChapterChange = useCallback(async (index) => {
    if (!book) return;
    stopTts();
    const chapter = await getChapter(book.id, index);
    if (!chapter) return;

    setLoadedChapters([chapter]);
    setCurrentChapterIndex(index);
    updateBookProgress(book.id, { currentChapter: index, readingProgress: index / book.chapterCount });

    // Mark for auto-play after state updates
    autoPlayChapterRef.current = index;
  }, [book, updateBookProgress, stopTts]);

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
      play(flat, 0, currentChapterIndex, map);
    }

    autoPlayChapterRef.current = null;
  }, [loadedChapters, currentChapterIndex, play]);

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

  return (
    <div className="h-screen flex flex-col relative" style={{ backgroundColor: 'var(--bg)' }}>
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
              play(flatSentences, flatIdx, currentChapterIndex, sentenceMap);
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
        onChapterChange={handleTtsChapterChange}
        play={play}
        pause={pause}
        resume={resume}
        stop={stopTts}
      />
    </div>
  );
}
