'use client';

export default function ReadingProgressBar({ progress }) {
  return (
    <div className="h-0.5 w-full" style={{ backgroundColor: 'var(--border)' }}>
      <div
        className="h-full transition-all duration-150"
        style={{
          width: `${Math.min(100, Math.max(0, progress * 100))}%`,
          backgroundColor: 'var(--accent)',
        }}
      />
    </div>
  );
}
