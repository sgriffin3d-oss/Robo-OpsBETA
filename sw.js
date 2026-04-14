const CACHE_NAME = 'paragon-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './calc.js',
  './view.js',
  './manifest.json',
  './images/field.png',
  './images/skills.png',
  './images/icon.png'
];

// Installs assets for offline use
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Clean up old caches when updating versions
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Smart Fetching Strategy
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // STRATEGY: Network-Only for Robot Events API
  // We don't want to cache match results because they change every minute
  if (url.hostname.includes('robotevents.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // STRATEGY: Cache-First for internal app assets
  // This keeps the app fast and working offline
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
