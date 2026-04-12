const CACHE_NAME = 'paragon-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './calc.js',
  './view.js',
  './manifest.json',
  './images/field.png',
  './images/icon.png'
];

// This "installs" the files into the phone's memory
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// This makes the app load from the cache even if there's no Wi-Fi
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});