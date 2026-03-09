'use client';

import dynamic from 'next/dynamic';
import { ReaderContentSkeleton } from '@/components/loading-skeleton';

// Lazy-load the heavy reader component so client-side navigation from home
// shows the loading skeleton instantly while the reader JS bundle downloads.
const ReaderPageClient = dynamic(() => import('./reader-page-client'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <ReaderContentSkeleton />
    </div>
  ),
});

export default function ReaderPage() {
  return <ReaderPageClient />;
}
