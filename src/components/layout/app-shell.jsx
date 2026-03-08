'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './sidebar';
import BottomNav from './bottom-nav';

// AppShell wraps page content with responsive navigation.
// Sidebar shown >= 768px, BottomNav shown < 768px.
// Navigation hidden on reader routes (full-screen UI).
export default function AppShell({ children }) {
  const pathname = usePathname();
  const isReader = pathname?.startsWith('/reader');

  if (isReader) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Sidebar: visible on md+ */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content area */}
      <main
        className="flex-1 md:ml-[200px] pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0"
        style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
      >
        {children}
      </main>

      {/* Bottom nav: visible on mobile only */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
