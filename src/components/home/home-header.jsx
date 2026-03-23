'use client';

import { Plus } from 'lucide-react';

// Home page header with app title and import button.
export default function HomeHeader({ onImport }) {
  return (
    <div className="px-4 pt-6 pb-3">
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--text)' }}
        >
          Tủ sách
        </h1>
        <button
          onClick={onImport}
          className="w-9 h-9 flex items-center justify-center rounded-full transition-colors duration-200"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          aria-label="Nhập sách"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}
