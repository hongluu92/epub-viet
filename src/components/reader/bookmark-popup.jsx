'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/stores/app-store';

export default function BookmarkPopup({ sentenceData, bookId, onPlayFrom, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [onClose]);

  if (!sentenceData) return null;

  // Position near the target element
  const rect = sentenceData.target?.getBoundingClientRect();
  const top = rect ? Math.min(rect.bottom + 8, window.innerHeight - 60) : 200;
  const left = rect ? Math.min(rect.left, window.innerWidth - 200) : 100;

  function handleCopy() {
    navigator.clipboard?.writeText(sentenceData.text?.trim() || '');
    onClose();
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ text: sentenceData.text?.trim() }).catch(() => {});
    }
    onClose();
  }

  const btnClass = 'px-3 py-2 text-sm font-medium rounded-lg transition-colors';

  return (
    <div
      ref={ref}
      className="fixed z-50 flex gap-1 p-1.5 rounded-xl shadow-xl"
      style={{
        top: `${top}px`,
        left: `${Math.max(8, left)}px`,
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <button onClick={() => {
        useAppStore.getState().addBookmark({
          bookId,
          chapterIndex: sentenceData.chapterIndex,
          paragraphIndex: sentenceData.paragraphIndex,
          sentenceIndex: sentenceData.sentenceIndex,
          text: sentenceData.text?.trim() || '',
        });
        onClose();
      }} className={btnClass} style={{ color: 'var(--text)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 4 }}>
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        Luu
      </button>
      <button onClick={() => {
        onPlayFrom?.(sentenceData);
        onClose();
      }} className={btnClass} style={{ color: 'var(--accent)' }}>
        Doc tu day
      </button>
      <button onClick={handleCopy} className={btnClass} style={{ color: 'var(--text)' }}>
        Sao chep
      </button>
    </div>
  );
}
