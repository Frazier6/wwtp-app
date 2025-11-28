// Service Worker for WWTP PWA
const CACHE_NAME = 'wwtp-pwa-v1.0.0';
const RUNTIME_CACHE = 'wwtp-runtime-v1.0.0';

// Files to cache on installation
const PRECACHE_URLS = [
  '/wwtp-app/',
  '/wwtp-app/index.html',
  '/wwtp-app/WWTP-COMPLETE-PWA.html',
  '/wwtp-app/wwtp-pwa-enhanced.html',
  '/wwtp-app/offline.html',
  '/wwtp-app/manifest.json',
  '/wwtp-app/icons/icon-192x192.png',
  '/wwtp-app/icons/icon-512x512.png'
];

// Install event - cache core assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Precaching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE)
          .map(cacheName => {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/wwtp-app/offline.html');
        })
    );
    return;
  }

  // Cache-first strategy for assets
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return caches.open(RUNTIME_CACHE)
          .then(cache => {
            return fetch(event.request)
              .then(response => {
                // Cache successful responses
                if (response && response.status === 200) {
                  cache.put(event.request, response.clone());
                }
                return response;
              });
          });
      })
      .catch(() => {
        // Return offline page for failed navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/wwtp-app/offline.html');
        }
      })
  );
});

// Handle messages from the main app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for data submission (when online)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  console.log('[Service Worker] Syncing data...');
  // Add your data sync logic here
}

// Push notification support
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/wwtp-app/icons/icon-192x192.png',
    badge: '/wwtp-app/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'wwtp-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('WWTP Alert', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/wwtp-app/')
  );
});
