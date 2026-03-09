'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Bookmark, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { LoginButton, UserMenu } from '@/components/auth';

const NAV_ITEMS = [
  { label: 'Tu sach', icon: BookOpen, href: '/' },
  { label: 'Dau trang', icon: Bookmark, href: '/bookmarks' },
  { label: 'Cai dat', icon: Settings, href: '/settings' },
];

// Fixed left sidebar for desktop (md+). 200px wide, vertical nav tabs.
export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside
      className="fixed left-0 top-0 h-full w-[200px] flex flex-col border-r z-40"
      style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--border)' }}
    >
      {/* App title */}
      <div className="px-5 py-6">
        <span
          className="text-xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--text)' }}
        >
          ReadFlow
        </span>
      </div>

      {/* Navigation items */}
      <nav className="flex flex-col gap-1 px-3 flex-1">
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 text-sm font-medium"
              style={{
                backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)',
              }}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User auth section */}
      <div className="px-4 py-5">
        {user ? <UserMenu /> : <LoginButton />}
      </div>
    </aside>
  );
}
