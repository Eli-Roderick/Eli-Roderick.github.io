const CACHE_NAME = 'serp-exp-cache-v3';
const CORE_ASSETS = [
  '/configs/index.json'
];

// Skip waiting to activate new service worker immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  // Take control immediately
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Delete old caches
      caches.keys().then((keys) => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k))))
    ])
  );
});

// Network-first strategy for HTML and JS files, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;
  
  // For HTML and JS files, use network-first
  if (request.destination === 'document' || 
      request.destination === 'script' ||
      url.pathname.endsWith('.jsx') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.html') ||
      url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          // Cache the fresh response
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, respClone));
          return resp;
        })
        .catch(() => caches.match(request)) // Fallback to cache if offline
    );
    return;
  }
  
  // For other assets (images, CSS, configs), use cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).then((resp) => {
        const respClone = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, respClone));
        return resp;
      }).catch(() => cached);
    })
  );
});
