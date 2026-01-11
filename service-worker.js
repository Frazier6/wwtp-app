const CACHE_NAME = 'wwtp-v10.65';

self.addEventListener('install', (event) => {
  console.log('WWTP Service Worker: Installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('WWTP Service Worker: Activating');
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
