const CACHE_NAME = 'webplayer-v4';

const ASSETS = [
  './', './index.html', './style.css', './manifest.json', './icon.svg',
  './song1.mp3','./song2.mp3','./song3.mp3','./song4.mp3','./song5.mp3',
  './song6.mp3','./song7.mp3','./song8.mp3','./song9.mp3','./song10.mp3',
  './song11.mp3','./song12.mp3','./song13.mp3','./song14.mp3','./song15.mp3',
  './song16.mp3','./song17.mp3','./song18.mp3',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(ASSETS.map(async url => {
        try {
          // cache:'no-cache' forces a fresh fetch (avoids 206 partials)
          const res = await fetch(url, { cache: 'no-cache' });
          if (res.status === 200) {
            await cache.put(url, res);
            console.log('✅ cached', url);
          } else {
            console.warn('⚠️ skipped', url, 'status', res.status);
          }
        } catch (e) {
          console.warn('❌ failed', url, e.message);
        }
      }))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(res => {
        // Only cache full 200 responses — never 206 partials
        if (res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
        }
        return res;
      }).catch(() => {
        if (event.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
