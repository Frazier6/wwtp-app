// APEX WWTP Pro - Service Worker
// Version 1.0.0

const CACHE_NAME = 'apex-wwtp-v1.0.0';
const STATIC_CACHE = 'apex-static-v1';
const DYNAMIC_CACHE = 'apex-dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/wwtp-pwa-enhanced.html',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('⚡ Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name !== STATIC_CACHE && name !== DYNAMIC_CACHE;
            })
            .map((name) => {
              console.log(`🗑️ Service Worker: Deleting old cache: ${name}`);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome extension requests
  if (request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached response if found
        if (cachedResponse) {
          console.log(`📦 Serving from cache: ${request.url}`);
          
          // Update cache in background for next time
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(DYNAMIC_CACHE)
                  .then((cache) => {
                    cache.put(request, networkResponse.clone());
                  });
              }
            })
            .catch(() => {
              // Network failed, but we have cache
            });
          
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        console.log(`🌐 Fetching from network: ${request.url}`);
        return fetch(request)
          .then((networkResponse) => {
            // Check if valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
              return networkResponse;
            }
            
            // Clone response for cache
            const responseToCache = networkResponse.clone();
            
            // Cache successful responses
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
            
            return networkResponse;
          })
          .catch((error) => {
            console.error(`❌ Fetch failed for ${request.url}:`, error);
            
            // Return offline fallback page if available
            return caches.match('/offline.html')
              .then((offlineResponse) => {
                if (offlineResponse) {
                  return offlineResponse;
                }
                
                // Return basic offline response
                return new Response(
                  `<!DOCTYPE html>
                  <html>
                  <head>
                    <title>Offline - APEX WWTP</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                      body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        text-align: center;
                        padding: 20px;
                      }
                      .container {
                        background: rgba(255,255,255,0.1);
                        padding: 40px;
                        border-radius: 20px;
                        backdrop-filter: blur(10px);
                      }
                      h1 { font-size: 3em; margin: 0 0 20px 0; }
                      p { font-size: 1.2em; margin: 10px 0; }
                      button {
                        background: white;
                        color: #667eea;
                        border: none;
                        padding: 15px 30px;
                        border-radius: 10px;
                        font-size: 1em;
                        font-weight: bold;
                        cursor: pointer;
                        margin-top: 20px;
                      }
                      button:hover { opacity: 0.9; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <h1>📵</h1>
                      <h2>You're Offline</h2>
                      <p>APEX WWTP requires an internet connection for this feature.</p>
                      <p>Cached data is still available for viewing.</p>
                      <button onclick="location.reload()">Try Again</button>
                    </div>
                  </body>
                  </html>`,
                  {
                    status: 200,
                    statusText: 'OK',
                    headers: new Headers({
                      'Content-Type': 'text/html'
                    })
                  }
                );
              });
          });
      })
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync triggered');
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// Sync data function
async function syncData() {
  console.log('📤 Service Worker: Syncing data...');
  
  try {
    // Get pending data from IndexedDB or localStorage
    // This is where you'd implement actual sync logic
    
    // Simulate sync
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Service Worker: Data synced successfully');
    
    // Notify all clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        message: 'Data synced successfully'
      });
    });
    
  } catch (error) {
    console.error('❌ Service Worker: Sync failed', error);
    throw error;
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('📬 Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'apex-notification',
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Close' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('APEX WWTP', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
  console.log('💬 Service Worker: Message received', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then((cache) => {
          return cache.addAll(event.data.urls);
        })
    );
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((name) => caches.delete(name))
          );
        })
        .then(() => {
          console.log('🗑️ Service Worker: All caches cleared');
        })
    );
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('🔄 Service Worker: Periodic sync triggered');
  
  if (event.tag === 'data-sync') {
    event.waitUntil(syncData());
  }
});

console.log('🚀 APEX WWTP Service Worker loaded');
