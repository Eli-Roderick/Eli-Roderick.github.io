const CACHE_NAME = 'serp-exp-cache-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/index.css',
  '/src/registerSW.js',
  '/configs/index.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k))))
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (new URL(request.url).origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((resp) => {
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, respClone));
          return resp;
        }).catch(() => cached);
      })
    );
  }
});
