import ProgressBar from './ProgressBar.jsx';
import styles from './BookCard.module.css';

// Book card with cover, progress, and favorite toggle
export default function BookCard({ book, onOpen, onToggleFavorite }) {
  const { id, title, author, coverUrl, progress = 0, totalChapters = 0, isFavorite } = book;

  function handleFavorite(e) {
    e.stopPropagation();
    onToggleFavorite?.(id);
  }

  return (
    <div className={styles.card} onClick={() => onOpen?.(id)}>
      {/* Cover */}
      <div className={styles.cover}>
        {coverUrl ? (
          <img src={coverUrl} alt={title} className={styles.coverImg} />
        ) : (
          <div className={styles.coverPlaceholder}>📖</div>
        )}
        {/* Heart button */}
        <button
          className={`${styles.heartBtn} ${isFavorite ? styles.heartActive : ''}`}
          onClick={handleFavorite}
          aria-label={isFavorite ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
      </div>

      {/* Info */}
      <div className={styles.info}>
        <div className={styles.title}>{title}</div>
        <div className={styles.author}>{author}</div>
        <div className={styles.progressWrap}>
          <ProgressBar value={progress} total={totalChapters} />
          <span className={styles.progressLabel}>
            Chương {progress}/{totalChapters}
          </span>
        </div>
      </div>
    </div>
  );
}
