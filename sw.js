const CACHE_NAME = 'paragon-v6';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './events.css',
  './onboarding.css',
  './rules.css',
  './app.js',
  './auth.js',
  './events.js',
  './onboarding.js',
  './calc.js',
  './view.js',
  './rules.js',
  './rules_ui.js',
  './manifest.json',
  './images/field.png',
  './images/skills.png',
  './images/icon.png',
  './images/icon-192.png',
  './images/icon-512.png'
];

// Install: cache assets one by one so a single missing file doesn't kill everything
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS.map(asset =>
          cache.add(asset).catch(err => console.warn('SW: failed to cache', asset, err))
        )
      );
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-only for APIs, cache-first for everything else
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Network-only: RobotEvents API (live match data)
  if (url.hostname.includes('robotevents.com') || url.hostname.includes('supabase.co')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Cache-first: app shell and assets
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request).then((response) => {
        // Opportunistically cache new successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      });
    }).catch(() => caches.match('./index.html')) // Fallback to app shell if offline
  );
});
