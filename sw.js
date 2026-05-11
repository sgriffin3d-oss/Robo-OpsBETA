const CACHE_NAME = 'robo-ops-v1';
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
  './install.css',
  './install.js',
  './manifest.json',
  './images/field.png',
  './images/skills.png',
  './images/icon.png',
  './images/icon-192.png',
  './images/icon-512.png'
];

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

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  
  if (url.hostname.includes('robotevents.com') || url.hostname.includes('supabase.co')) {
    e.respondWith(fetch(e.request));
    return;
  }

  
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request).then((response) => {
        
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      });
    }).catch(() => caches.match('./index.html')) 
  );
});
