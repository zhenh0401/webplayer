/* ---------- Service Worker for offline playback ---------- */

const CACHE_NAME = 'webplayer-v10';

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
  './song19.mp3',
  './song20.mp3',
  './song21.mp3',
  './song22.mp3',
  './song23.mp3',
];

/* ---------- INSTALL: cache everything, one at a time ---------- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const url of ASSETS) {
        try {
          const abs = new URL(url, self.location).href;
          const res = await fetch(abs, { cache: 'no-cache' });
          if (res.status === 200) {
            await cache.put(abs, res.clone());
            console.log('✅ cached', abs);
          } else {
            console.warn('⚠️ skipped', abs, 'status', res.status);
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

  // Normalize: strip query string, use absolute URL
  const url = new URL(req.url);
  url.search = '';
  const key = url.href;

  let cached = await cache.match(key);
  if (!cached) cached = await cache.match(req, { ignoreSearch: true });

  // Not in cache → try network
  if (!cached) {
    console.log('🌐 cache miss, fetching:', key);
    try {
      const res = await fetch(req);
      if (res.status === 200 && res.type === 'basic') {
        cache.put(key, res.clone());
      }
      return res;
    } catch (e) {
      console.warn('💥 offline + not cached:', key);
      if (req.mode === 'navigate') {
        const index = await cache.match(new URL('./index.html', self.location).href);
        if (index) return index;
      }
      return new Response('offline', { status: 504 });
    }
  }

  // Cache hit — no Range → serve full
  const rangeHeader = req.headers.get('range');
  if (!rangeHeader) {
    console.log('📦 from cache:', key);
    return cached;
  }

  // Range requested → slice cached bytes
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
