
self.addEventListener('install', function(event)
{
	// Perform install steps
	event.waitUntil(
		caches.open('flagplayer-cache-1')
		.then(function(cache)
		{
			console.log('Opened cache');
			return cache.addAll([
				'/FlagPlayerDev/style.css',
				'/FlagPlayerDev/index.html',
				'/FlagPlayerDev/page.js'
			]);
		})
	);
});

self.addEventListener('fetch', function(event)
{
	if (event.request.url.match(/\/FlagPlayerDev(|\/|\/index\.html)(\?.*)?$/))
		event.respondWith(caches.match("/FlagPlayerDev/index.html"));
	else {
		event.respondWith(
			caches.match(event.request)
			.then(function(response)
			{
				// Cache hit - return response
				if (response)
				{
					console.log('Cached ' + event.request.url);
					return response;
				}
				console.log('Loading ' + event.request.url);
				return fetch(event.request);
			})
		);
	}
});