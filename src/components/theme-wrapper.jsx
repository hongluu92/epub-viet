'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/stores/app-store';

export default function ThemeWrapper({ children }) {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    const el = document.documentElement;
    // Add transition class for smooth theme switch
    el.classList.add('theme-transitioning');
    el.dataset.theme = theme;
    const timer = setTimeout(() => el.classList.remove('theme-transitioning'), 350);
    return () => clearTimeout(timer);
  }, [theme]);

  return children;
}
