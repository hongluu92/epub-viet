import { useEffect } from 'react';
import useTTS from '../hooks/useTTS.js';
import styles from './ModelLoadingModal.module.css';

// Overlay modal shown while TTS model is downloading — auto-dismisses at 100%
export default function ModelLoadingModal() {
  const { isModelLoading, modelProgress } = useTTS();

  // Auto-dismiss handled by isModelLoading becoming false
  if (!isModelLoading) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.icon}>🔊</div>
        <h3 className={styles.title}>Đang tải mô hình giọng đọc...</h3>
        <p className={styles.subtitle}>(63MB) — vui lòng chờ</p>

        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${Math.min(100, modelProgress)}%` }}
          />
        </div>

        <p className={styles.pct}>{Math.round(modelProgress)}%</p>
      </div>
    </div>
  );
}
