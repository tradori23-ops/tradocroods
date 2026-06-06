// ══════════════════════════════════════════════════════
// TradoCroods Service Worker — v230
// Strategia: Network-first per index.html, cache per assets
// ══════════════════════════════════════════════════════

const CACHE_VERSION = 'tc-v230';
const CACHE_NAME = 'tradocroods-' + CACHE_VERSION;

// File da cachare (assets statici)
const ASSETS_TO_CACHE = [
  './icon-192.png',
  './icon-512.png',
  './manifest.json'
];

// Installa: precache solo assets, NON index.html
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

// Attiva: elimina TUTTE le cache vecchie
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Eliminazione cache vecchia:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: Network-first per index.html, cache per il resto
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // index.html — SEMPRE dalla rete, mai dalla cache
  if (url.pathname.endsWith('/') || 
      url.pathname.endsWith('/index.html') || 
      url.pathname.endsWith('/tradocroods/')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // API esterne (Gist, EmailJS, Firebase) — sempre rete
  if (url.hostname !== self.location.hostname) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Assets statici — cache first con fallback rete
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// Messaggi dal client
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
  if (event.data === 'clearCache') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});
