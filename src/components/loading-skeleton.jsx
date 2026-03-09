'use client';

/**
 * Reusable skeleton loader components with pulse animation.
 * Matches the app's theme via CSS variables.
 */

/** Base skeleton block with pulse animation */
function SkeletonBlock({ className = '', style = {} }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ backgroundColor: 'var(--skeleton-bg, rgba(128,128,128,0.15))', ...style }}
      aria-hidden="true"
    />
  );
}

/** Skeleton for a book card (vertical card with cover + title) */
export function BookCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-28" aria-label="Loading book">
      <SkeletonBlock className="w-28 h-40 mb-2" />
      <SkeletonBlock className="h-3 w-full mb-1" />
      <SkeletonBlock className="h-3 w-3/4" />
    </div>
  );
}

/** Row of book card skeletons for the library/browse shelf */
export function BookShelfSkeleton({ count = 4 }) {
  return (
    <div className="flex gap-3 px-4 pb-2 overflow-hidden" aria-busy="true" aria-label="Loading books">
      {Array.from({ length: count }).map((_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton for reader content — a few paragraph blocks */
export function ReaderContentSkeleton() {
  return (
    <div className="px-4 py-6 space-y-4 max-w-2xl mx-auto" aria-busy="true" aria-label="Loading chapter">
      <SkeletonBlock className="h-6 w-2/3 mx-auto mb-6" />
      {[1, 0.9, 0.95, 0.85, 0.92, 0.88, 0.75].map((w, i) => (
        <SkeletonBlock key={i} className="h-4" style={{ width: `${w * 100}%` }} />
      ))}
      <div className="pt-2 space-y-3">
        {[0.95, 0.9, 0.85, 0.92].map((w, i) => (
          <SkeletonBlock key={i} className="h-4" style={{ width: `${w * 100}%` }} />
        ))}
      </div>
      <div className="pt-2 space-y-3">
        {[0.88, 0.93, 0.8, 0.7].map((w, i) => (
          <SkeletonBlock key={i} className="h-4" style={{ width: `${w * 100}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Single-line text skeleton */
export function TextSkeleton({ width = '100%', height = '1rem' }) {
  return <SkeletonBlock style={{ width, height }} />;
}

export default BookCardSkeleton;
