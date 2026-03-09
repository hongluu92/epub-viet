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

export default function SettingsPage() {
  const { theme, setTheme, fontSize, setFontSize, lineHeight, setLineHeight, ttsSpeed } = useAppStore();
  const books = useLibraryStore((s) => s.books);
  const { user } = useAuth();

  const THEMES = ['light', 'dark', 'sepia'];

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <h1 className="text-2xl font-semibold px-4 pt-6 pb-2" style={{ fontFamily: 'var(--font-lora)' }}>
        Cài đặt
      </h1>

      {/* Tai khoan */}
      <SectionHeader title="Tai khoan" />
      <SettingsCard>
        <SettingsRow label={user ? user.displayName : 'Tai khoan'}>
          {user ? <UserMenu /> : <LoginButton />}
        </SettingsRow>
      </SettingsCard>

      {/* Giao dien */}
      <SectionHeader title="Giao dien" />
      <SettingsCard>
        <SettingsRow label="Chu de">
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
                {t === 'light' ? 'Sang' : t === 'dark' ? 'Toi' : 'Sepia'}
              </button>
            ))}
          </div>
        </SettingsRow>
      </SettingsCard>

      {/* Doc sach */}
      <SectionHeader title="Doc sach" />
      <SettingsCard>
        <SettingsRow label={`Co chu: ${fontSize}px`}>
          <input
            type="range" min={12} max={32} step={1}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-28"
            style={{ accentColor: 'var(--accent)' }}
          />
        </SettingsRow>
        <SettingsRow label={`Gian dong: ${lineHeight.toFixed(1)}`}>
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
      <SectionHeader title="TTS" />
      <SettingsCard>
        <SettingsRow label="Toc do doc">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{ttsSpeed}x</span>
        </SettingsRow>
      </SettingsCard>

      {/* Luu tru */}
      <SectionHeader title="Luu tru" />
      <SettingsCard>
        <SettingsRow label="Thu vien">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{books.length} cuon sach</span>
        </SettingsRow>
      </SettingsCard>

      {/* Gioi thieu */}
      <SectionHeader title="Gioi thieu" />
      <SettingsCard>
        <SettingsRow label="ReadFlow v1.0">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Doc truyen Viet Nam</span>
        </SettingsRow>
      </SettingsCard>
    </div>
  );
}
