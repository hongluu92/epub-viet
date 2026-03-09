'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker on mount (client-side only).
 * Rendered once in RootLayout — no visible UI.
 */
export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/epub-viet/sw.js', { scope: '/epub-viet/' })
        .then((reg) => {
          console.log('[SW] Registered, scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[SW] Registration failed:', err);
        });
    }
  }, []);

  return null;
}
