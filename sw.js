const CACHE_NAME = 'daza-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './index.css',
  './manifest.json',
  './icons/logo.jpg',
  './js/db.js',
  './js/app.js',
  './js/views/dashboard.js',
  './js/views/clients.js',
  './js/views/orders.js',
  './js/views/inventory.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
