// WWTP Service Worker — handles both WW Pro-Calc and Command Center
// Version: v9.57 / v14.5.0
// File: service-worker.js
// Deployed at: https://frazier6.github.io/wwtp-app/service-worker.js
//
// HOW TO DEPLOY:
// Upload this file to your GitHub repo alongside index.html
// It must be at the same path level as the HTML files

var CACHE_NAME = 'wwtp-v14.5.0';

// ── Install: skip waiting, activate immediately ──────────────
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Pre-cache known app entry points (best-effort — won't fail if unavailable)
      return cache.addAll([
        './',
        './index.html'
      ]).catch(function() {
        // Pre-caching failed (offline at install) — that's OK
        // The fetch handler will cache on demand
        return;
      });
    })
  );
});

// ── Activate: claim clients, clean old caches ────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) {
            return (name.startsWith('wwtp-') || name.startsWith('ww-pro-calc-'))
                   && name !== CACHE_NAME;
          })
          .map(function(name) { return caches.delete(name); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── Fetch: cache-first for navigation, network-first for API ─
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // ── Never intercept these — always go to network ────────────
  if (url.indexOf('api.anthropic.com') >= 0) return;
  if (url.indexOf('open-meteo.com') >= 0) return;
  if (url.indexOf('googleapis.com') >= 0) return;
  if (url.indexOf('gstatic.com') >= 0) return;

  // ── Navigation requests (page loads) ─────────────────────────
  // This is the critical path for Samsung Internet offline PWA support
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request).then(function(cachedResponse) {
        if (cachedResponse) {
          // Serve from cache immediately, then update cache in background
          fetch(event.request)
            .then(function(networkResponse) {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then(function(cache) {
                  cache.put(event.request, networkResponse);
                });
              }
            })
            .catch(function() { /* offline — already served from cache */ });
          return cachedResponse;
        }

        // Not in cache — try network
        return fetch(event.request)
          .then(function(networkResponse) {
            if (networkResponse && networkResponse.status === 200) {
              var responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(function() {
            // Fully offline and not cached — try fallback
            return caches.match('./index.html')
              .then(function(fallback) {
                return fallback || new Response(
                  '<!DOCTYPE html><html><head><title>WW Pro-Calc</title></head>' +
                  '<body style="background:#0f172a;color:#f8fafc;font-family:sans-serif;' +
                  'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
                  'height:100vh;margin:0;text-align:center;padding:20px;">' +
                  '<div style="font-size:3rem">📵</div>' +
                  '<h2 style="color:#10b981;margin:16px 0 8px">You are offline</h2>' +
                  '<p style="color:#94a3b8;max-width:300px">' +
                  'Open the app with WiFi on first to enable offline access. ' +
                  'After that first visit, the app will work without WiFi.</p>' +
                  '</body></html>',
                  { headers: { 'Content-Type': 'text/html' } }
                );
              });
          });
      })
    );
    return;
  }

  // ── All other requests (JS, CSS, images, fonts) ──────────────
  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request)
        .then(function(networkResponse) {
          if (!networkResponse || networkResponse.status !== 200 ||
              networkResponse.type === 'opaque') {
            return networkResponse;
          }
          var responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(function() {
          return new Response('Offline', { status: 503 });
        });
    })
  );
});

// ── Message handler: force update on demand ──────────────────
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
