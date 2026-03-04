import styles from './ProgressBar.module.css';

// Generic progress bar — value/total → percentage fill with optional label
export default function ProgressBar({ value = 0, total = 100, label, showLabel = false }) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;

  return (
    <div className={styles.wrapper}>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && (
        <div className={styles.label}>
          {label || `${Math.round(pct)}%`}
        </div>
      )}
    </div>
  );
}
