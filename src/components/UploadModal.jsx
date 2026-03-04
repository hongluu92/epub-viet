import { useRef, useState } from 'react';
import { parseEpub } from '../services/epub-parser.js';
import { uploadEpub } from '../services/sync-service.js';
import useAppStore from '../store/app-store.js';
import styles from './UploadModal.module.css';

// Modal for drag-drop / browse EPUB upload with parse preview
export default function UploadModal({ isOpen, onClose }) {
  const user = useAppStore((s) => s.user);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null); // { title, author, cover, chapterCount, file }
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  async function handleFile(file) {
    if (!file || !file.name.endsWith('.epub')) {
      setError('Vui lòng chọn file .epub hợp lệ.');
      return;
    }
    setError(null);
    setPreview(null);
    try {
      const parsed = await parseEpub(file);
      setPreview({
        title: parsed.metadata?.title || 'Không có tiêu đề',
        author: parsed.metadata?.creator || 'Không rõ tác giả',
        cover: parsed.metadata?.coverUrl || null,
        chapterCount: parsed.chapters?.length ?? 0,
        file,
      });
    } catch (err) {
      setError(`Lỗi đọc file: ${err.message}`);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }

  function handleInputChange(e) {
    handleFile(e.target.files[0]);
  }

  async function handleConfirm() {
    if (!preview) return;
    const uid = user?.uid || 'guest';
    const bookId = `book_${Date.now()}`;
    setUploading(true);
    setUploadProgress(0);
    try {
      await uploadEpub(uid, bookId, preview.file, (pct) => setUploadProgress(pct));
      onClose();
    } catch (err) {
      setError(`Lỗi tải lên: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Tải lên sách EPUB</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Drop zone */}
        {!preview && (
          <div
            className={`${styles.dropZone} ${dragging ? styles.dragging : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={styles.dropIcon}>📥</div>
            <p className={styles.dropText}>Kéo thả file EPUB vào đây</p>
            <p className={styles.dropSub}>hoặc</p>
            <button className={styles.browseBtn} type="button">Chọn file EPUB</button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".epub"
              className={styles.hiddenInput}
              onChange={handleInputChange}
            />
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className={styles.preview}>
            {preview.cover ? (
              <img src={preview.cover} alt={preview.title} className={styles.previewCover} />
            ) : (
              <div className={styles.previewCoverPlaceholder}>📖</div>
            )}
            <div className={styles.previewInfo}>
              <div className={styles.previewTitle}>{preview.title}</div>
              <div className={styles.previewAuthor}>{preview.author}</div>
              <div className={styles.previewMeta}>{preview.chapterCount} chương</div>
              <button className={styles.changeBtn} onClick={() => setPreview(null)}>
                Chọn file khác
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && <p className={styles.error}>{error}</p>}

        {/* Upload progress */}
        {uploading && (
          <div className={styles.uploadProgress}>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${uploadProgress}%` }} />
            </div>
            <span className={styles.progressText}>Đang tải lên... {Math.round(uploadProgress)}%</span>
          </div>
        )}

        {/* Confirm button */}
        {preview && !uploading && (
          <button className={styles.confirmBtn} onClick={handleConfirm}>
            Xác nhận tải lên
          </button>
        )}
      </div>
    </div>
  );
}
