import styles from './ReaderPage.module.css';

// Top bar for ReaderPage — back, title, chapter select, settings, bookmark
export default function ReaderTopBar({
  bookTitle,
  chapters,
  chapterIdx,
  onChapterChange,
  onBack,
  onToggleSettings,
  onBookmark,
}) {
  return (
    <div className={styles.topBar}>
      <button className={styles.topBtn} onClick={onBack} aria-label="Quay lại">
        ←
      </button>

      <div className={styles.topCenter}>
        <span className={styles.topTitle} title={bookTitle}>
          {bookTitle || 'Đọc sách'}
        </span>

        {chapters && chapters.length > 1 && (
          <select
            className={styles.chapterSelect}
            value={chapterIdx}
            onChange={(e) => onChapterChange(Number(e.target.value))}
          >
            {chapters.map((ch, idx) => (
              <option key={idx} value={idx}>
                {ch.title || `Chương ${idx + 1}`}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className={styles.topActions}>
        <button
          className={styles.topBtn}
          onClick={onToggleSettings}
          aria-label="Cài đặt đọc"
        >
          ⚙️
        </button>
        <button
          className={styles.topBtn}
          onClick={onBookmark}
          aria-label="Đánh dấu"
        >
          🔖
        </button>
      </div>
    </div>
  );
}
