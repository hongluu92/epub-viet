import { Suspense } from 'react';
import ReaderPageClient from './reader-page-client';

export default function ReaderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>}>
      <ReaderPageClient />
    </Suspense>
  );
}
