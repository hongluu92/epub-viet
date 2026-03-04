import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useBooks from '../hooks/useBooks.js';
import BookCard from '../components/BookCard.jsx';
import UploadModal from '../components/UploadModal.jsx';
import styles from './LibraryPage.module.css';

// LibraryPage — full book grid with search and upload
export default function LibraryPage() {
  const navigate = useNavigate();
  const { books, loading, deleteBook, toggleFav, reload } = useBooks();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // bookId to confirm delete

  const filtered = books.filter((b) => {
    const q = query.toLowerCase();
    return (
      !q ||
      b.title?.toLowerCase().includes(q) ||
      b.author?.toLowerCase().includes(q)
    );
  });

  function handleOpen(bookId) {
    navigate(`/read/${bookId}`);
  }

  function handleUploadClose() {
    setUploadOpen(false);
    reload();
  }

  async function handleDelete(bookId) {
    setConfirmDelete(null);
    await deleteBook(bookId);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Thư viện</h1>
        <button className={styles.uploadBtn} onClick={() => setUploadOpen(true)}>
          + Tải lên sách
        </button>
      </div>

      <input
        className={styles.searchInput}
        type="search"
        placeholder="Tìm theo tên sách hoặc tác giả..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && <div className={styles.loading}>Đang tải...</div>}

      {!loading && books.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📚</div>
          <p className={styles.emptyText}>Chưa có sách nào trong thư viện.</p>
          <button className={styles.uploadCta} onClick={() => setUploadOpen(true)}>
            Tải lên EPUB ngay
          </button>
        </div>
      )}

      {!loading && books.length > 0 && filtered.length === 0 && (
        <div className={styles.empty}>
          <p className={styles.emptyText}>Không tìm thấy sách nào phù hợp.</p>
        </div>
      )}

      <div className={styles.grid}>
        {filtered.map((book) => (
          <div key={book.bookId} className={styles.gridItem}>
            <BookCard book={book} onOpen={handleOpen} onToggleFavorite={toggleFav} />
            <button
              className={styles.deleteBtn}
              onClick={() => setConfirmDelete(book.bookId)}
              aria-label="Xóa sách"
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      {/* Inline delete confirm */}
      {confirmDelete && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
            <p className={styles.confirmText}>Xóa sách này khỏi thư viện?</p>
            <div className={styles.confirmBtns}>
              <button className={styles.cancelBtn} onClick={() => setConfirmDelete(null)}>
                Hủy
              </button>
              <button className={styles.confirmDeleteBtn} onClick={() => handleDelete(confirmDelete)}>
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      <UploadModal isOpen={uploadOpen} onClose={handleUploadClose} />
    </div>
  );
}
