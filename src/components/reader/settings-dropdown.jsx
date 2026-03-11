'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { FONT_FAMILIES, THEMES } from '@/lib/utils/theme-tokens';

const THEME_LABELS = { light: 'Sáng', dark: 'Tối', sepia: 'Sepia' };
const THEME_COLORS = {
  light: { bg: '#F5F0E8', text: '#1A1A1A' },
  dark: { bg: '#1A1814', text: '#E8E0D0' },
  sepia: { bg: '#F4ECD8', text: '#3B2F1E' },
};
const FONT_LABELS = { lora: 'Lora', 'system-serif': 'Serif', 'system-sans': 'Sans' };
const FONT_KEYS = Object.keys(FONT_FAMILIES);

export default function SettingsDropdown({ onClose }) {
  const ref = useRef(null);
  const {
    theme, setTheme,
    fontSize, setFontSize,
    fontFamily, setFontFamily,
    lineHeight, setLineHeight,
    readerMargin, setReaderMargin,
    ttsSpeed, setTtsSpeed,
  } = useAppStore();

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Cycle font family
  const handleFontCycle = () => {
    const idx = FONT_KEYS.indexOf(fontFamily);
    setFontFamily(FONT_KEYS[(idx + 1) % FONT_KEYS.length]);
  };

  const rowClass = 'flex items-center justify-between py-2';
  const labelStyle = { color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 };
  const divider = <div className="my-2" style={{ height: 1, background: 'var(--border)' }} />;

  return (
    <div
      ref={ref}
      className="absolute top-12 right-3 w-64 rounded-2xl shadow-lg p-4 z-50"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Font Size */}
      <div className={rowClass}>
        <span style={labelStyle}>Cỡ chữ</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFontSize(fontSize - 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold"
            style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            A-
          </button>
          <span className="text-sm font-semibold min-w-7 text-center" style={{ color: 'var(--text)' }}>
            {fontSize}
          </span>
          <button
            onClick={() => setFontSize(fontSize + 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold"
            style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            A+
          </button>
        </div>
      </div>

      {/* Font Family */}
      <div className={rowClass}>
        <span style={labelStyle}>Font</span>
        <button onClick={handleFontCycle} className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          {FONT_LABELS[fontFamily] || 'Lora'} <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>&#9662;</span>
        </button>
      </div>

      {/* Line Height */}
      <div className={rowClass}>
        <span style={labelStyle}>Dãn dòng</span>
        <input
          type="range" min="1.4" max="2.4" step="0.1"
          value={lineHeight}
          onChange={(e) => setLineHeight(parseFloat(e.target.value))}
          className="w-20"
          style={{ accentColor: 'var(--accent)' }}
        />
      </div>

      {/* Margin */}
      <div className={rowClass}>
        <span style={labelStyle}>Lề</span>
        <input
          type="range" min="8" max="48" step="4"
          value={readerMargin}
          onChange={(e) => setReaderMargin(parseInt(e.target.value))}
          className="w-20"
          style={{ accentColor: 'var(--accent)' }}
        />
      </div>

      {divider}

      {/* Theme */}
      <div className="py-2">
        <span style={labelStyle}>Giao diện</span>
        <div className="flex gap-2 mt-2">
          {THEMES.map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-colors"
              style={{
                borderColor: theme === t ? 'var(--accent)' : 'var(--border)',
                backgroundColor: THEME_COLORS[t].bg,
                color: THEME_COLORS[t].text,
              }}
            >
              {THEME_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {divider}

      {/* TTS Speed */}
      <div className={rowClass}>
        <span style={labelStyle}>Tốc độ</span>
        <div className="flex items-center gap-2">
          <input
            type="range" min="0.5" max="2.0" step="0.1"
            value={ttsSpeed}
            onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
            className="w-20"
            style={{ accentColor: 'var(--accent)' }}
          />
          <span className="text-xs font-semibold min-w-7 text-center" style={{ color: 'var(--text)' }}>
            {ttsSpeed === 1.0 ? '1x' : `${ttsSpeed.toFixed(1)}x`}
          </span>
        </div>
      </div>
    </div>
  );
}
