const CACHE = 'bc-v7';
const PRECACHE = ['./index.html', './manifest.json', './sw.js'];

// Only cache http/https requests — never chrome-extension:// or blob: etc.
const isCacheable = req =>
  req.url.startsWith('http://') || req.url.startsWith('https://');

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(PRECACHE.map(url => c.add(url).catch(() => {})))
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!isCacheable(e.request)) return; // skip chrome-extension://, blob:, etc.

  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request.clone()).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const toCache = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, toCache).catch(() => {}));
        }
        return response;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
