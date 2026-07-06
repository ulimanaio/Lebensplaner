// App-Shell-Cache: App lädt sofort, Daten kommen frisch vom Server.
const CACHE = 'lebensplaner-v5';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/css/app.css', '/css/fonts.css', '/js/app.js', '/js/api.js', '/js/challenges-data.js', '/icons/icon-192.svg', '/icons/icon-512.svg', '/fonts/inter-400.woff2', '/fonts/inter-500.woff2', '/fonts/inter-700.woff2'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) return; // API nie cachen
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
