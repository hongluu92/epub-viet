// ReadFlow Service Worker — cache-first for app shell, network-first for API
const CACHE_NAME = 'readflow-v1';

// App shell pages to pre-cache on install
const APP_SHELL = [
  '/epub-viet/',
  '/epub-viet/reader',
  '/epub-viet/bookmarks',
  '/epub-viet/settings',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Remove stale caches from previous versions
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and non-http requests
  if (!request.url.startsWith('http')) return;

  // Skip ONNX WASM and model files — too large, let browser cache handle them
  if (
    request.url.includes('.wasm') ||
    request.url.includes('ort-wasm') ||
    request.url.includes('/model/') ||
    request.url.includes('piper/')
  ) return;

  // Skip external API calls (timsach.vn)
  if (!request.url.includes(self.location.hostname)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      // Return cached version if available
      if (cached) return cached;

      // Fetch from network and cache the response
      return fetch(request).then((response) => {
        // Only cache valid same-origin responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, toCache));
        return response;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/epub-viet/');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
