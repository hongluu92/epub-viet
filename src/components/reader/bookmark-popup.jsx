'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/stores/app-store';

const COLORS = ['yellow', 'green', 'blue', 'red'];
const COLOR_HEX = { yellow: '#FFEB3B', green: '#4CAF50', blue: '#2196F3', red: '#F44336' };

export default function BookmarkPopup({ sentenceData, bookId, onPlayFrom, onClose }) {
  const ref = useRef(null);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  // Look up existing annotation for this sentence
  const existing = useAppStore((s) =>
    s.bookmarks.find((b) =>
      b.bookId === bookId &&
      b.chapterIndex === sentenceData?.chapterIndex &&
      b.paragraphIndex === sentenceData?.paragraphIndex &&
      b.sentenceIndex === sentenceData?.sentenceIndex
    ) || null
  );

  // Pre-fill note text from existing annotation
  useEffect(() => {
    if (existing?.note) setNoteText(existing.note);
  }, [existing?.note]);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [onClose]);

  if (!sentenceData) return null;

  const rect = sentenceData.target?.getBoundingClientRect();
  const top = rect ? Math.min(rect.bottom + 8, window.innerHeight - (showNote ? 200 : 100)) : 200;
  const left = rect ? Math.min(rect.left, window.innerWidth - 260) : 40;

  const sentenceKey = {
    bookId,
    chapterIndex: sentenceData.chapterIndex,
    paragraphIndex: sentenceData.paragraphIndex,
    sentenceIndex: sentenceData.sentenceIndex,
    text: sentenceData.text?.trim() || '',
  };

  function handleColorSelect(color) {
    const store = useAppStore.getState();
    if (existing?.color === color) {
      // Toggle off — remove annotation
      store.removeBookmark(sentenceKey);
    } else {
      store.addBookmark({ ...sentenceKey, color, note: existing?.note || null });
    }
    onClose();
  }

  function handleRemove() {
    useAppStore.getState().removeBookmark(sentenceKey);
    onClose();
  }

  function handleSaveNote() {
    const trimmed = noteText.trim();
    useAppStore.getState().addBookmark({
      ...sentenceKey,
      color: existing?.color || 'yellow',
      note: trimmed || null,
    });
    onClose();
  }

  function handleCopy() {
    navigator.clipboard?.writeText(sentenceData.text?.trim() || '');
    onClose();
  }

  const btnClass = 'px-2.5 py-1.5 text-xs font-medium rounded-lg';

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-xl shadow-xl"
      style={{
        top: `${top}px`,
        left: `${Math.max(8, left)}px`,
        width: 250,
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: 10,
      }}
    >
      {/* Row 1: Color chips */}
      <div className="flex gap-2 items-center mb-2">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => handleColorSelect(c)}
            className="w-7 h-7 rounded-full border-2 transition-transform"
            style={{
              backgroundColor: COLOR_HEX[c],
              borderColor: existing?.color === c ? 'var(--text)' : 'transparent',
              transform: existing?.color === c ? 'scale(1.15)' : 'scale(1)',
            }}
            aria-label={`Tô màu ${c}`}
          />
        ))}
        {existing && (
          <button onClick={handleRemove} className="ml-auto text-xs px-1.5 py-0.5 rounded"
            style={{ color: 'var(--text-muted)' }}>
            ✕ Xóa
          </button>
        )}
      </div>

      {/* Row 2: Actions */}
      <div className="flex gap-1">
        <button onClick={() => setShowNote(!showNote)} className={btnClass}
          style={{ color: existing?.note ? 'var(--accent)' : 'var(--text-secondary)' }}>
          📝 Ghi chú
        </button>
        <button onClick={() => { onPlayFrom?.(sentenceData); onClose(); }}
          className={btnClass} style={{ color: 'var(--accent)' }}>
          ▶ Đọc
        </button>
        <button onClick={handleCopy} className={btnClass} style={{ color: 'var(--text-secondary)' }}>
          📋 Chép
        </button>
      </div>

      {/* Row 3: Note input (shown on tap) */}
      {showNote && (
        <div className="mt-2">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Nhập ghi chú..."
            rows={2}
            className="w-full text-xs p-2 rounded-lg resize-none outline-none"
            style={{
              backgroundColor: 'var(--bg)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
            autoFocus
          />
          <button onClick={handleSaveNote}
            className="mt-1 text-xs px-3 py-1 rounded-lg font-medium w-full"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
            Lưu ghi chú
          </button>
        </div>
      )}
    </div>
  );
}
