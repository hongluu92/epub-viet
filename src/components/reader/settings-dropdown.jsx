'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/stores/app-store';
import { THEMES } from '@/lib/utils/theme-tokens';

export default function SettingsDropdown({ onClose }) {
  const ref = useRef(null);
  const {
    theme, setTheme,
    fontSize, setFontSize,
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

  const labelStyle = { color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' };
  const sectionClass = 'py-3 border-b';
  const borderStyle = { borderColor: 'var(--border)' };

  return (
    <div
      ref={ref}
      className="absolute top-full right-4 mt-1 w-72 rounded-xl shadow-lg p-4 z-50"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Font Size */}
      <div className={sectionClass} style={borderStyle}>
        <p style={labelStyle}>Font Size</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFontSize(fontSize - 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
            style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
          >
            A-
          </button>
          <span className="text-sm font-medium flex-1 text-center" style={{ color: 'var(--text)' }}>
            {fontSize}px
          </span>
          <button
            onClick={() => setFontSize(fontSize + 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
            style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
          >
            A+
          </button>
        </div>
      </div>

      {/* Line Height */}
      <div className={sectionClass} style={borderStyle}>
        <p style={labelStyle}>Line Height: {lineHeight.toFixed(1)}</p>
        <input
          type="range" min="1.4" max="2.4" step="0.1"
          value={lineHeight}
          onChange={(e) => setLineHeight(parseFloat(e.target.value))}
          className="w-full accent-current"
          style={{ accentColor: 'var(--accent)' }}
        />
      </div>

      {/* Margin */}
      <div className={sectionClass} style={borderStyle}>
        <p style={labelStyle}>Margin: {readerMargin}px</p>
        <input
          type="range" min="8" max="48" step="4"
          value={readerMargin}
          onChange={(e) => setReaderMargin(parseInt(e.target.value))}
          className="w-full"
          style={{ accentColor: 'var(--accent)' }}
        />
      </div>

      {/* Theme */}
      <div className={sectionClass} style={borderStyle}>
        <p style={labelStyle}>Theme</p>
        <div className="flex gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className="flex-1 py-2 rounded-lg text-xs font-medium capitalize border-2 transition-colors"
              style={{
                borderColor: theme === t ? 'var(--accent)' : 'var(--border)',
                backgroundColor: theme === t ? 'var(--accent)' : 'var(--bg)',
                color: theme === t ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* TTS Speed */}
      <div className="pt-3">
        <p style={labelStyle}>TTS Speed: {ttsSpeed.toFixed(1)}x</p>
        <input
          type="range" min="0.5" max="2.0" step="0.1"
          value={ttsSpeed}
          onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
          className="w-full"
          style={{ accentColor: 'var(--accent)' }}
        />
      </div>
    </div>
  );
}
