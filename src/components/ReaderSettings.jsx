import useAppStore from '../store/app-store.js';
import styles from './ReaderSettings.module.css';

// Slide-in settings panel from the right
export default function ReaderSettings({ isOpen, onClose }) {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  return (
    <>
      {/* Backdrop — click to close */}
      {isOpen && <div className={styles.backdrop} onClick={onClose} />}

      <div className={`${styles.panel} ${isOpen ? styles.open : ''}`}>
        <div className={styles.header}>
          <h3 className={styles.title}>Cài đặt đọc</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          {/* Font size */}
          <div className={styles.row}>
            <label className={styles.label}>
              Cỡ chữ
              <span className={styles.value}>{settings.fontSize}px</span>
            </label>
            <input
              type="range"
              min={14}
              max={28}
              step={1}
              value={settings.fontSize}
              className={styles.slider}
              onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
            />
            <div className={styles.rangeHints}>
              <span>14px</span><span>28px</span>
            </div>
          </div>

          {/* Line height */}
          <div className={styles.row}>
            <label className={styles.label}>
              Giãn dòng
              <span className={styles.value}>{settings.lineHeight ?? 1.8}</span>
            </label>
            <input
              type="range"
              min={1.4}
              max={2.2}
              step={0.1}
              value={settings.lineHeight ?? 1.8}
              className={styles.slider}
              onChange={(e) => updateSettings({ lineHeight: Number(e.target.value) })}
            />
            <div className={styles.rangeHints}>
              <span>1.4</span><span>2.2</span>
            </div>
          </div>

          {/* TTS speed */}
          <div className={styles.row}>
            <label className={styles.label}>
              Tốc độ đọc
              <span className={styles.value}>{settings.ttsSpeed ?? 1}x</span>
            </label>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.25}
              value={settings.ttsSpeed ?? 1}
              className={styles.slider}
              onChange={(e) => updateSettings({ ttsSpeed: Number(e.target.value) })}
            />
            <div className={styles.rangeHints}>
              <span>0.5x</span><span>2x</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
