'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getBook, getChapter, getChaptersByBook } from '@/lib/services/indexeddb-service';
import { useLibraryStore } from '@/lib/stores/library-store';
import ReaderHeader from '@/components/reader/reader-header';
import ReadingProgressBar from '@/components/reader/reading-progress-bar';
import SettingsDropdown from '@/components/reader/settings-dropdown';
import ReaderContent from '@/components/reader/reader-content';
import BookmarkPopup from '@/components/reader/bookmark-popup';
import TtsBar from '@/components/reader/tts-bar';

export default function ReaderPage() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [chapterMeta, setChapterMeta] = useState([]); // titles only
  const [loadedChapters, setLoadedChapters] = useState([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [popupData, setPopupData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateBookProgress = useLibraryStore((s) => s.updateBookProgress);

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

  // Load next chapter for infinite scroll
  const loadNextChapter = useCallback(async () => {
    if (!book || loadedChapters.length === 0) return;
    const lastLoaded = loadedChapters[loadedChapters.length - 1];
    const nextIdx = lastLoaded.chapterIndex + 1;

    if (nextIdx >= book.chapterCount) return;

    const nextChapter = await getChapter(book.id, nextIdx);
    if (nextChapter) {
      setLoadedChapters((prev) => [...prev, nextChapter]);
    }
  }, [book, loadedChapters]);

  // Jump to chapter
  const handleChapterSelect = useCallback(async (index) => {
    if (!book) return;
    const chapter = await getChapter(book.id, index);
    if (chapter) {
      setLoadedChapters([chapter]);
      setCurrentChapterIndex(index);
      updateBookProgress(book.id, { currentChapter: index, readingProgress: index / book.chapterCount });
    }
  }, [book, updateBookProgress]);

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

  // Flatten sentences from current visible chapter for TTS
  const currentChapter = loadedChapters.find((c) => c.chapterIndex === currentChapterIndex);
  const flatSentences = currentChapter?.sentences
    ? currentChapter.sentences.flat()
    : currentChapter?.paragraphs || [];

  const hasMore =
    loadedChapters.length > 0 &&
    loadedChapters[loadedChapters.length - 1].chapterIndex < book.chapterCount - 1;

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
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
        onLoadNext={loadNextChapter}
        hasMore={hasMore}
        onScrollProgress={handleScrollProgress}
        onVisibleChapterChange={handleVisibleChapterChange}
        onLongPressSentence={(data) => setPopupData(data)}
      />

      {popupData && (
        <BookmarkPopup
          sentenceData={popupData}
          onClose={() => setPopupData(null)}
        />
      )}

      <TtsBar sentences={flatSentences} chapterIndex={currentChapterIndex} />
    </div>
  );
}
