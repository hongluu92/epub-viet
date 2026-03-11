'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Bookmark, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Home', icon: Home, href: '/' },
  { label: 'Tủ sách', icon: BookOpen, href: '/library' },
  { label: 'Dấu trang', icon: Bookmark, href: '/bookmarks' },
  { label: 'Cài đặt', icon: Settings, href: '/settings' },
];

// Fixed bottom navigation bar for mobile viewports.
// Uses safe-area-inset-bottom for notched devices.
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around backdrop-blur-md border-t"
      style={{
        backgroundColor: 'var(--nav-bg)',
        borderColor: 'var(--border)',
        height: 'calc(64px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors duration-200"
            style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <Icon size={22} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
