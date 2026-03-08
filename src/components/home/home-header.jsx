'use client';

import { Bell, Plus } from 'lucide-react';

// Home page header with title and action buttons.
// onImport callback triggers the EPUB upload modal.
export default function HomeHeader({ onImport }) {
  return (
    <div className="flex items-center justify-between px-4 pt-6 pb-4">
      <h1
        className="text-2xl font-semibold"
        style={{ fontFamily: 'var(--font-lora)', color: 'var(--text)' }}
      >
        Tu Sach
      </h1>
      <div className="flex items-center gap-2">
        <button
          className="w-9 h-9 flex items-center justify-center rounded-full transition-colors duration-200"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Thong bao"
        >
          <Bell size={20} />
        </button>
        <button
          onClick={onImport}
          className="w-9 h-9 flex items-center justify-center rounded-full transition-colors duration-200"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          aria-label="Import sach"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}
