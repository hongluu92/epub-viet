'use client';

import { Plus, Search } from 'lucide-react';

// Home page header with search input and import button.
export default function HomeHeader({ onImport, searchQuery, onSearchChange }) {
  return (
    <div className="px-4 pt-6 pb-3">
      <div className="flex items-center justify-between mb-3">
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--text)' }}
        >
          Tu Sach
        </h1>
        <button
          onClick={onImport}
          className="w-9 h-9 flex items-center justify-center rounded-full transition-colors duration-200"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          aria-label="Import sach"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-muted)' }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tim sach tren timsach.vn..."
          className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
          style={{
            backgroundColor: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          }}
        />
      </div>
    </div>
  );
}
