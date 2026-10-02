/* ---------- Service Worker for offline playback ---------- */

const CACHE_NAME = 'webplayer-v6';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './icon.svg',
  './song1.mp3',
  './song2.mp3',
  './song3.mp3',
  './song4.mp3',
  './song5.mp3',
  './song6.mp3',
  './song7.mp3',
  './song8.mp3',
  './song9.mp3',
  './song10.mp3',
  './song11.mp3',
  './song12.mp3',
  './song13.mp3',
  './song14.mp3',
  './song15.mp3',
  './song16.mp3',
  './song17.mp3',
  './song18.mp3',
];

/* ---------- INSTALL: cache everything, one file at a time ---------- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const url of ASSETS) {
        try {
          const res = await fetch(url, { cache: 'no-cache' });
          if (res.status === 200) {
            await cache.put(url, res.clone());
            console.log('✅ cached', url);
          } else {
            console.warn('⚠️ skipped', url, 'status', res.status);
          }
        } catch (e) {
          console.warn('❌ failed', url, e.message);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

/* ---------- ACTIVATE: clear old caches ---------- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ---------- FETCH: serve from cache, fall back to network ---------- */
self.addEventListener('fetch', event => {
  const req = event.request;

  // Only handle GET
  if (req.method !== 'GET') return;

  // Let range requests (used by <audio> seeking) hit the network directly.
  if (req.headers.get('range')) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(cached => {
      if (cached) return cached;

      return fetch(req)
        .then(res => {
          if (res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          if (req.mode === 'navigate') return caches.match('./index.html');
        });
    })
  );
});
