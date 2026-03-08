'use client';

export default function ChapterDivider() {
  return (
    <div className="flex items-center justify-center py-6">
      <div
        className="w-full max-w-xs border-t-2 border-dashed"
        style={{ borderColor: 'var(--border)' }}
      />
    </div>
  );
}
