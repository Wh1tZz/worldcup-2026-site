const FRAME_CACHE = 'worldcup-frame-cache-v1';
const STATIC_CACHE = 'worldcup-static-cache-v1';
const FRAME_RE = /\/frames60\/frame_\d{6}\.jpg$/;
const STATIC_RE = /\.(?:html|css|js|png|svg|ico|webmanifest)$/;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== FRAME_CACHE && key !== STATIC_CACHE)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (FRAME_RE.test(url.pathname)) {
    event.respondWith(cacheFirst(request, FRAME_CACHE));
    return;
  }

  if (STATIC_RE.test(url.pathname) || url.pathname.endsWith('/')) {
    event.respondWith(networkFirst(request, STATIC_CACHE));
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    try {
      await cache.put(request, response.clone());
    } catch (error) {
      console.warn('Frame cache write skipped:', error);
    }
  }
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      try {
        await cache.put(request, response.clone());
      } catch (error) {
        console.warn('Static cache write skipped:', error);
      }
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw error;
  }
}
