'use client';

import { useEffect, useRef } from 'react';

export default function BookmarkPopup({ sentenceData, onClose }) {
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
      <button onClick={handleCopy} className={btnClass} style={{ color: 'var(--text)' }}>
        Copy
      </button>
      <button onClick={handleShare} className={btnClass} style={{ color: 'var(--text)' }}>
        Share
      </button>
    </div>
  );
}
