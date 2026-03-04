import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBook } from '../hooks/useBook.js';
import useReadingProgress from '../hooks/useReadingProgress.js';
import useTTS from '../hooks/useTTS.js';
import useAppStore from '../store/app-store.js';
import { getEpubDownloadUrl, addBookmark } from '../services/sync-service.js';
import SentenceRenderer from '../components/SentenceRenderer.jsx';
import TtsControls from '../components/TtsControls.jsx';
import ReaderSettings from '../components/ReaderSettings.jsx';
import ModelLoadingModal from '../components/ModelLoadingModal.jsx';
import ReaderTopBar from './reader-top-bar.jsx';
import useReaderKeyboardShortcuts from './reader-keyboard-shortcuts.js';
import styles from './ReaderPage.module.css';

// ReaderPage — fullscreen reading view with TTS, chapter nav, settings, bookmarks
export default function ReaderPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();

  const { user, ttsActive, setTtsActive, setCurrentBook } = useAppStore();
  const { book, currentChapter, chapterIdx, loading, error, loadBook, navigateChapter } = useBook();
  const { progress, updateProgress } = useReadingProgress(bookId);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookmarkSaved, setBookmarkSaved] = useState(false);

  const sentences = currentChapter?.sentences ?? [];

  const handleSentenceChange = useCallback(
    (idx) => updateProgress({ chapterIdx, sentenceIdx: idx }),
    [chapterIdx, updateProgress]
  );

  const tts = useTTS({ onSentenceChange: handleSentenceChange });
  const { isPlaying, isPaused, currentSentenceIdx, play, pause, resume, stop, skipNext, skipPrev } = tts;

  // Load book on mount
  useEffect(() => {
    if (!bookId) return;
    async function init() {
      try {
        const uid = user?.uid ?? 'guest';
        const url = await getEpubDownloadUrl(uid, bookId);
        await loadBook(bookId, url);
      } catch (err) {
        console.error('[ReaderPage] init error:', err);
      }
    }
    init();
  }, [bookId, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set currentBook in store so TtsControls can render
  useEffect(() => {
    if (book) setCurrentBook({ bookId, title: book.metadata?.title });
    return () => setCurrentBook(null);
  }, [book, bookId, setCurrentBook]);

  // Auto-resume TTS on chapter change if ttsActive
  useEffect(() => {
    if (ttsActive && sentences.length > 0) {
      stop();
      setTimeout(() => play(sentences, 0), 80);
    }
  }, [chapterIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track ttsActive whenever playing state changes
  useEffect(() => {
    setTtsActive(isPlaying && !isPaused);
  }, [isPlaying, isPaused, setTtsActive]);

  // Auto-advance chapter when TTS reaches last sentence
  useEffect(() => {
    if (!isPlaying && !isPaused && ttsActive && sentences.length > 0) {
      const hasNext = book && chapterIdx < book.chapters.length - 1;
      if (hasNext) navigateChapter(chapterIdx + 1);
    }
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click sentence → jump TTS
  const handleSentenceClick = useCallback(
    (idx) => {
      stop();
      setTimeout(() => play(sentences, idx), 50);
    },
    [sentences, stop, play]
  );

  // Bookmark current position
  const handleBookmark = useCallback(async () => {
    try {
      await addBookmark(user?.uid ?? null, bookId, { chapterIdx, sentenceIdx: currentSentenceIdx });
      setBookmarkSaved(true);
      setTimeout(() => setBookmarkSaved(false), 2000);
    } catch (err) {
      console.error('[ReaderPage] bookmark error:', err);
    }
  }, [user?.uid, bookId, chapterIdx, currentSentenceIdx]);

  const handleBack = useCallback(() => {
    stop();
    navigate(-1);
  }, [stop, navigate]);

  // Keyboard shortcuts
  useReaderKeyboardShortcuts({
    isPlaying, isPaused, sentences,
    play, pause, resume, skipNext, skipPrev,
    onBack: handleBack,
  });

  if (error) {
    return (
      <div className={styles.error}>
        <p>Không thể tải sách: {error}</p>
        <button onClick={handleBack}>← Quay lại</button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <ReaderTopBar
        bookTitle={book?.metadata?.title}
        chapters={book?.chapters}
        chapterIdx={chapterIdx}
        onChapterChange={navigateChapter}
        onBack={handleBack}
        onToggleSettings={() => setSettingsOpen((v) => !v)}
        onBookmark={handleBookmark}
      />

      {bookmarkSaved && (
        <div className={styles.bookmarkToast}>Đã lưu dấu trang ✓</div>
      )}

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>Đang tải sách...</div>
        ) : (
          <SentenceRenderer
            sentences={sentences}
            activeSentenceIdx={currentSentenceIdx}
            onSentenceClick={handleSentenceClick}
          />
        )}
      </div>

      <TtsControls />

      <ReaderSettings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <ModelLoadingModal />
    </div>
  );
}
