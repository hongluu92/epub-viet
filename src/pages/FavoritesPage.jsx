import { useNavigate } from 'react-router-dom';
import useBooks from '../hooks/useBooks.js';
import BookCard from '../components/BookCard.jsx';
import styles from './FavoritesPage.module.css';

// FavoritesPage — filtered grid of favorited books
export default function FavoritesPage() {
  const navigate = useNavigate();
  const { favorites, loading, toggleFav } = useBooks();

  function handleOpen(bookId) {
    navigate(`/read/${bookId}`);
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Yêu thích ❤️</h1>

      {loading && <div className={styles.loading}>Đang tải...</div>}

      {!loading && favorites.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🤍</div>
          <p className={styles.emptyText}>Chưa có sách yêu thích.</p>
          <p className={styles.emptyHint}>
            Nhấn ❤️ trên bất kỳ sách nào để thêm vào đây.
          </p>
        </div>
      )}

      {!loading && favorites.length > 0 && (
        <div className={styles.grid}>
          {favorites.map((book) => (
            <BookCard
              key={book.bookId}
              book={book}
              onOpen={handleOpen}
              onToggleFavorite={toggleFav}
            />
          ))}
        </div>
      )}
    </div>
  );
}
