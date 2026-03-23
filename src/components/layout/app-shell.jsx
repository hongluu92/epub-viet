'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar, BottomNav } from '@/components/layout';

// AppShell wraps page content with responsive navigation.
// Sidebar shown >= 768px, BottomNav shown < 768px.
// Navigation hidden on reader routes (full-screen UI).
export default function AppShell({ children }) {
  const pathname = usePathname();
  const isReader = pathname?.startsWith('/reader');

  // Offline indicator
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (isReader) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Offline banner */}
      {!isOnline && (
        <div className="text-center text-xs py-1 flex-shrink-0"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
          Ngoại tuyến — đọc sách đã tải vẫn hoạt động
        </div>
      )}

      <div className="flex flex-1 min-h-0">
      {/* Sidebar: visible on md+ */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content area */}
      <main
        className="flex-1 min-w-0 md:ml-[200px] pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0 page-enter"
        style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
      >
        {children}
      </main>

      {/* Bottom nav: visible on mobile only */}
      <div className="md:hidden">
        <BottomNav />
      </div>
      </div>
    </div>
  );
}
