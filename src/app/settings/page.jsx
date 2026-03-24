'use client';

import { useAppStore } from '@/lib/stores/app-store';
import { useLibraryStore } from '@/lib/stores/library-store';
import { useAuth } from '@/hooks/use-auth';
import { LoginButton, UserMenu } from '@/components/auth';

function SectionHeader({ title }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider px-4 pt-5 pb-2"
      style={{ color: 'var(--text-secondary)' }}>
      {title}
    </h2>
  );
}

function SettingsCard({ children }) {
  return (
    <div className="mx-4 rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)' }}>
      {children}
    </div>
  );
}

function SettingsRow({ label, children }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b last:border-b-0"
      style={{ borderColor: 'var(--border)' }}>
      <span className="text-sm" style={{ color: 'var(--text)' }}>{label}</span>
      <div>{children}</div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="p-3 rounded-xl text-center" style={{ backgroundColor: 'var(--surface)' }}>
      <p className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{value}</p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

function ReadingStatsSection() {
  const stats = useAppStore((s) => s.readingStats);
  const hours = Math.floor((stats?.totalReadingMs || 0) / 3600000);
  const minutes = Math.floor(((stats?.totalReadingMs || 0) % 3600000) / 60000);
  const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <div className="mx-4 grid grid-cols-3 gap-3">
      <StatCard label="Thời gian" value={timeStr} />
      <StatCard label="Chương" value={stats?.chaptersCompleted || 0} />
      <StatCard label="Chuỗi ngày" value={`${stats?.currentStreak || 0}`} />
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme, fontSize, setFontSize, lineHeight, setLineHeight, ttsSpeed, ttsEngine, setTtsEngine } = useAppStore();
  const books = useLibraryStore((s) => s.books);
  const { user } = useAuth();

  const THEMES = ['light', 'dark', 'sepia'];

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <h1 className="text-2xl font-semibold px-4 pt-6 pb-2" style={{ fontFamily: 'var(--font-lora)' }}>
        Cài đặt
      </h1>

      {/* Tai khoan */}
      <SectionHeader title="Tài khoản" />
      <SettingsCard>
        <SettingsRow label={user ? user.displayName : 'Tài khoản'}>
          {user ? <UserMenu /> : <LoginButton />}
        </SettingsRow>
      </SettingsCard>

      {/* Giao dien */}
      <SectionHeader title="Giao diện" />
      <SettingsCard>
        <SettingsRow label="Chủ đề">
          <div className="flex gap-2">
            {THEMES.map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className="px-3 py-1 rounded-full text-xs font-medium capitalize border transition-colors duration-200"
                style={{
                  backgroundColor: theme === t ? 'var(--accent)' : 'transparent',
                  color: theme === t ? '#fff' : 'var(--text-secondary)',
                  borderColor: theme === t ? 'var(--accent)' : 'var(--border)',
                }}
              >
                {t === 'light' ? 'Sáng' : t === 'dark' ? 'Tối' : 'Sepia'}
              </button>
            ))}
          </div>
        </SettingsRow>
      </SettingsCard>

      {/* Doc sach */}
      <SectionHeader title="Đọc sách" />
      <SettingsCard>
        <SettingsRow label={`Cỡ chữ: ${fontSize}px`}>
          <input
            type="range" min={12} max={32} step={1}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-28"
            style={{ accentColor: 'var(--accent)' }}
          />
        </SettingsRow>
        <SettingsRow label={`Giãn dòng: ${lineHeight.toFixed(1)}`}>
          <input
            type="range" min={1.4} max={2.2} step={0.1}
            value={lineHeight}
            onChange={(e) => setLineHeight(Number(e.target.value))}
            className="w-28"
            style={{ accentColor: 'var(--accent)' }}
          />
        </SettingsRow>
      </SettingsCard>

      {/* TTS */}
      <SectionHeader title="Đọc văn bản" />
      <SettingsCard>
        <SettingsRow label="Tốc độ đọc">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{ttsSpeed}x</span>
        </SettingsRow>
        <SettingsRow label="Giọng đọc">
          <div className="flex gap-1.5">
            {[
              { key: 'auto', label: 'Tự động' },
              { key: 'native', label: 'Hệ thống' },
              { key: 'onnx', label: 'Piper AI' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTtsEngine(key)}
                className="px-2 py-1 rounded-full text-[11px] font-medium border transition-colors"
                style={{
                  backgroundColor: ttsEngine === key ? 'var(--accent)' : 'transparent',
                  color: ttsEngine === key ? '#fff' : 'var(--text-secondary)',
                  borderColor: ttsEngine === key ? 'var(--accent)' : 'var(--border)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </SettingsRow>
      </SettingsCard>
      {ttsEngine === 'auto' && (
        <p className="text-[10px] px-4 mt-1" style={{ color: 'var(--text-muted)' }}>
          Tự động: Hệ thống trên iOS, Piper AI trên máy tính
        </p>
      )}

      {/* Thống kê đọc */}
      <SectionHeader title="Thống kê" />
      <ReadingStatsSection />

      {/* Lưu trữ */}
      <SectionHeader title="Lưu trữ" />
      <SettingsCard>
        <SettingsRow label="Thư viện">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{books.length} cuốn sách</span>
        </SettingsRow>
      </SettingsCard>

      {/* Gioi thieu */}
      <SectionHeader title="Giới thiệu" />
      <SettingsCard>
        <SettingsRow label="ReadFlow v1.0">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Đọc truyện Việt Nam</span>
        </SettingsRow>
      </SettingsCard>
    </div>
  );
}
