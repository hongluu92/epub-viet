import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useBooks from '../hooks/useBooks.js';
import BookCard from '../components/BookCard.jsx';
import UploadModal from '../components/UploadModal.jsx';
import styles from './HomePage.module.css';

// HomePage — hero "continue reading" card + recent books row
export default function HomePage() {
  const navigate = useNavigate();
  const { books, recentBooks, loading, toggleFav, reload } = useBooks();
  const [uploadOpen, setUploadOpen] = useState(false);

  const recent = recentBooks(6);
  const lastRead = recent[0] ?? null;

  function handleOpen(bookId) {
    navigate(`/read/${bookId}`);
  }

  function handleUploadClose() {
    setUploadOpen(false);
    reload();
  }

  if (loading) {
    return <div className={styles.loading}>Đang tải...</div>;
  }

  return (
    <div className={styles.page}>
      {/* Hero section */}
      <section className={styles.hero}>
        {lastRead ? (
          <>
            <div className={styles.heroLabel}>Tiếp tục đọc</div>
            <div className={styles.heroCard}>
              <BookCard
                book={lastRead}
                onOpen={handleOpen}
                onToggleFavorite={toggleFav}
              />
              <button
                className={styles.continueBtn}
                onClick={() => handleOpen(lastRead.bookId)}
              >
                Đọc tiếp →
              </button>
            </div>
          </>
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📚</div>
            <p className={styles.emptyText}>
              Chưa có sách nào. Tải lên EPUB để bắt đầu!
            </p>
            <button
              className={styles.uploadBtn}
              onClick={() => setUploadOpen(true)}
            >
              Tải lên sách ngay
            </button>
          </div>
        )}
      </section>

      {/* Recent books */}
      {recent.length > 1 && (
        <section className={styles.recentSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Đọc gần đây</h2>
            <button
              className={styles.uploadShortcut}
              onClick={() => setUploadOpen(true)}
            >
              + Tải lên sách mới
            </button>
          </div>
          <div className={styles.recentRow}>
            {recent.slice(1).map((book) => (
              <div key={book.bookId} className={styles.recentItem}>
                <BookCard
                  book={book}
                  onOpen={handleOpen}
                  onToggleFavorite={toggleFav}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upload button when books exist */}
      {books.length > 0 && recent.length <= 1 && (
        <div className={styles.uploadRow}>
          <button
            className={styles.uploadBtn}
            onClick={() => setUploadOpen(true)}
          >
            + Tải lên sách mới
          </button>
        </div>
      )}

      <UploadModal isOpen={uploadOpen} onClose={handleUploadClose} />
    </div>
  );
}
