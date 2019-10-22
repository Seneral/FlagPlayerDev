const CACHE_NAME =  'flagplayer-cache-1';

self.addEventListener('install', function(event)
{
	// Perform install steps
	event.waitUntil(
		caches.open(CACHE_NAME)
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
	else
	{
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
				return fetch(event.request).then(
					function(response)
					{
						if (!response || (response.status !== 200 && response.status !== 0) || response.type == 'error') {
							console.log("Discarding invalid response " + response + " with type " + response.type + " and status " + response.status);
							return response;
						}
						if (event.request.url.startsWith("https://www.seneral.dev/FlagPlayerDev/favicon") ||
							event.request.url.match(/https:\/\/i.ytimg.com\/vi\/[a-zA-Z0-9_-]{11}\/default\.jpg/)) 
						{
							console.log('Adding ' + event.request.url + ' to cache!');
							var cacheResponse = response.clone();
							caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheResponse));
						}
						else {
							console.log("Discarding url " + event.request.url);
						}

						return response;
					});
			})
		);
	}
});