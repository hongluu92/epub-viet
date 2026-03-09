'use client';

import dynamic from 'next/dynamic';

// Lazy-load the heavy reader component so client-side navigation from home
// shows the loading skeleton instantly while the reader JS bundle downloads.
const ReaderPageClient = dynamic(() => import('./reader-page-client'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
      <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
    </div>
  ),
});

export default function ReaderPage() {
  return <ReaderPageClient />;
}
