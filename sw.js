const CACHE = 'omhc-v4';
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
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => undefined)
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

  // Never cache during localhost development.
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    e.respondWith(fetch(e.request));
    return;
  }

  if (e.request.url.includes('firestore') ||
      e.request.url.includes('firebase')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Network-first for HTML/CSS/JS to avoid stale UI.
  const destination = e.request.destination;
  if (destination === 'document' || destination === 'style' || destination === 'script') {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, copy));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});
