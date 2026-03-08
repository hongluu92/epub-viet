'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/stores/app-store';

export default function ThemeWrapper({ children }) {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return children;
}
