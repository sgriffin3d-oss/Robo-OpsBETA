const CACHE_NAME = 'robo-ops-v1';
const ASSETS = [
  './',
  './index.html',
  './assets/css/style.css',
  './assets/css/events.css',
  './assets/css/onboarding.css',
  './assets/css/rules.css',
  './src/registry.js',
  './src/app.js',
  './src/auth.js',
  './src/events.js',
  './src/onboarding.js',
  './src/calc.js',
  './src/view.js',
  './src/rules.js',
  './src/rules_ui.js',
  './assets/css/install.css',
  './src/install.js',
  './manifest.json',
  './assets/images/field.png',
  './assets/images/skills.png',
  './assets/images/icon.png',
  './assets/images/icon-192.png',
  './assets/images/icon-512.png'
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
