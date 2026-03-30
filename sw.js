const CACHE = 'omhc-v6';
const ASSETS = [
  './',
  './index.html',
  './staff-login.html',
  './staff-dashboard.html',
  './admin-login.html',
  './admin-dashboard.html',
  './css/style.css',
  './js/firebase-config.js',
  './js/auth.js',
  './js/admin.js',
  './js/attendance.js',
  './js/report.js',
  './assets/logo.jpeg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE)
        .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const destination = e.request.destination;

  // Skip Firebase/Firestore/googleapis — always fresh
  if (url.href.includes('firebase') ||
      url.href.includes('firestore') ||
      url.href.includes('googleapis')) {
    return;
  }

  // Network-First for Scripts
  if (destination === 'script' || url.pathname.endsWith('.js')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Stale-While-Revalidate for CSS and Images
  if (destination === 'style' || destination === 'image' || destination === 'font') {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetched = fetch(e.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, copy));
          return res;
        });
        return cached || fetched;
      })
    );
    return;
  }

  // Network-First for main documents
  if (destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Default: Cache then Network
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
