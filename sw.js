/* ---------- Service Worker for offline playback ---------- */

const CACHE_NAME = 'webplayer-v8';

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

/* ---------- INSTALL: cache everything, one at a time ---------- */
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

/* ---------- FETCH: serve from cache, handle Range requests ---------- */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(handleRequest(req));
});

async function handleRequest(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req, { ignoreSearch: true });

  // Not in cache → fetch and store
  if (!cached) {
    try {
      const res = await fetch(req);
      if (res.status === 200 && res.type === 'basic') {
        cache.put(req, res.clone());
      }
      return res;
    } catch (e) {
      if (req.mode === 'navigate') {
        const index = await cache.match('./index.html');
        if (index) return index;
      }
      return new Response('', { status: 504 });
    }
  }

  // In cache — no Range → serve full response
  const rangeHeader = req.headers.get('range');
  if (!rangeHeader) return cached;

  // Range requested → slice cached bytes and return 206
  const buf = await cached.arrayBuffer();
  const size = buf.byteLength;

  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!match) return cached;

  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : size - 1;
  const chunk = buf.slice(start, end + 1);

  return new Response(chunk, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': cached.headers.get('content-type') || 'audio/mpeg',
      'Content-Length': String(chunk.byteLength),
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
    },
  });
}
