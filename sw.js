var CACHE_NAME = 'flagplayer-cache-1';
var urlsToCache = [
  '/FlagPlayerDev/style.css',
  '/FlagPlayerDev/index.html',
  '/FlagPlayerDev/page.js'
];

self.addEventListener('install', function(event) {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          console.log('Cached ' + event.request);
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});