'use client';

import { GENRE_SLUG_MAP } from '@/lib/services/timsach-service';

// Popular genres from timsach.vn
const GENRES = Object.keys(GENRE_SLUG_MAP);

// Horizontal scrollable genre filter pills.
export default function GenreChips({ activeGenre, onGenreChange }) {
  return (
    <div
      className="flex gap-2 px-4 pb-3 overflow-x-auto"
      style={{ scrollbarWidth: 'none' }}
    >
      {GENRES.map((genre) => {
        const isActive = activeGenre === genre;
        return (
          <button
            key={genre}
            onClick={() => onGenreChange(genre)}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 border"
            style={{
              backgroundColor: isActive ? 'var(--accent)' : 'var(--surface)',
              color: isActive ? '#fff' : 'var(--text)',
              borderColor: isActive ? 'var(--accent)' : 'var(--border)',
            }}
          >
            {genre}
          </button>
        );
      })}
    </div>
  );
}
