import useTTS from '../hooks/useTTS.js';
import useAppStore from '../store/app-store.js';
import styles from './TtsControls.module.css';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

// Floating TTS control bar — shown when a book is loaded
export default function TtsControls() {
  const currentBook = useAppStore((s) => s.currentBook);
  const parsedBook = useAppStore((s) => s.parsedBook);
  const chapterIdx = useAppStore((s) => s.chapterIdx);

  const sentences = parsedBook?.chapters?.[chapterIdx]?.sentences ?? [];
  const total = sentences.length;

  const {
    isPlaying, isPaused, currentSentenceIdx,
    isModelLoading, modelProgress,
    play, pause, resume, stop, setSpeed, skipNext, skipPrev,
    speed,
  } = useTTS();

  if (!currentBook) return null;

  function handlePlayPause() {
    if (isPlaying && !isPaused) pause();
    else if (isPaused) resume();
    else play(sentences, currentSentenceIdx);
  }

  function handleSkipNext() { skipNext(sentences); }
  function handleSkipPrev() { skipPrev(sentences); }

  return (
    <div className={styles.bar}>
      {/* Model loading indicator */}
      {isModelLoading && (
        <div className={styles.loadingRow}>
          <span className={styles.loadingText}>Đang tải model... {Math.round(modelProgress)}%</span>
          <div className={styles.loadingTrack}>
            <div className={styles.loadingFill} style={{ width: `${modelProgress}%` }} />
          </div>
        </div>
      )}

      <div className={styles.controls}>
        {/* Prev sentence */}
        <button className={styles.btn} onClick={handleSkipPrev} aria-label="Câu trước" disabled={isModelLoading}>
          ⏮
        </button>

        {/* Play / Pause */}
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handlePlayPause} aria-label="Phát/Dừng" disabled={isModelLoading}>
          {isPlaying && !isPaused ? '⏸' : '▶️'}
        </button>

        {/* Next sentence */}
        <button className={styles.btn} onClick={handleSkipNext} aria-label="Câu tiếp" disabled={isModelLoading}>
          ⏭
        </button>

        {/* Stop */}
        <button className={styles.btn} onClick={stop} aria-label="Dừng hẳn" disabled={isModelLoading}>
          ⏹
        </button>

        {/* Speed selector */}
        <select
          className={styles.speedSelect}
          value={speed ?? 1}
          onChange={(e) => setSpeed(Number(e.target.value))}
        >
          {SPEED_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}x</option>
          ))}
        </select>

        {/* Progress text */}
        {total > 0 && (
          <span className={styles.progress}>
            Câu {currentSentenceIdx + 1}/{total}
          </span>
        )}
      </div>
    </div>
  );
}
