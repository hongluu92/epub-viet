import useAuth from '../hooks/useAuth.js';
import useAppStore from '../store/app-store.js';
import { updateSettings as syncUpdateSettings } from '../services/sync-service.js';
import styles from './SettingsPage.module.css';

// SettingsPage — account info, display, reading, and app info sections
export default function SettingsPage() {
  const { user, isAuthenticated, signIn, signOut } = useAuth();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  function handleSetting(patch) {
    updateSettings(patch);
    if (user?.uid) {
      syncUpdateSettings(user.uid, { ...settings, ...patch });
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Cài đặt</h1>

      {/* Account section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Tài khoản</h2>
        {isAuthenticated && user ? (
          <div className={styles.accountRow}>
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className={styles.avatar} />
            ) : (
              <div className={styles.avatarPlaceholder}>👤</div>
            )}
            <div className={styles.accountInfo}>
              <div className={styles.displayName}>{user.displayName || 'Người dùng'}</div>
              <div className={styles.email}>{user.email}</div>
            </div>
            <button className={styles.signOutBtn} onClick={signOut}>
              Đăng xuất
            </button>
          </div>
        ) : (
          <div className={styles.signInRow}>
            <p className={styles.signInHint}>Đăng nhập để đồng bộ sách và cài đặt.</p>
            <button className={styles.googleBtn} onClick={signIn}>
              <span className={styles.googleIcon}>G</span>
              Đăng nhập với Google
            </button>
          </div>
        )}
      </section>

      {/* Display section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Giao diện</h2>

        <div className={styles.row}>
          <label className={styles.label}>
            Cỡ chữ
            <span className={styles.value}>{settings.fontSize ?? 18}px</span>
          </label>
          <input
            type="range"
            min={14}
            max={28}
            step={1}
            value={settings.fontSize ?? 18}
            className={styles.slider}
            onChange={(e) => handleSetting({ fontSize: Number(e.target.value) })}
          />
          <div className={styles.rangeHints}><span>14px</span><span>28px</span></div>
        </div>

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
            onChange={(e) => handleSetting({ lineHeight: Number(e.target.value) })}
          />
          <div className={styles.rangeHints}><span>1.4</span><span>2.2</span></div>
        </div>
      </section>

      {/* Reading section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Đọc</h2>

        <div className={styles.row}>
          <label className={styles.label}>
            Tốc độ đọc TTS
            <span className={styles.value}>{settings.ttsSpeed ?? 1}x</span>
          </label>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.25}
            value={settings.ttsSpeed ?? 1}
            className={styles.slider}
            onChange={(e) => handleSetting({ ttsSpeed: Number(e.target.value) })}
          />
          <div className={styles.rangeHints}><span>0.5x</span><span>2x</span></div>
        </div>

        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Tự động phát khi mở chương</span>
          <button
            className={`${styles.toggle} ${settings.ttsEnabled ? styles.toggleOn : ''}`}
            onClick={() => handleSetting({ ttsEnabled: !settings.ttsEnabled })}
            aria-label="Bật/tắt tự động phát"
          >
            <span className={styles.toggleKnob} />
          </button>
        </div>
      </section>

      {/* App info section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Thông tin</h2>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Phiên bản</span>
          <span className={styles.infoValue}>0.1.0</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Mã nguồn</span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.infoLink}
          >
            GitHub →
          </a>
        </div>
      </section>
    </div>
  );
}
