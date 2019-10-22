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
						if (!response || response.status !== 200 || response.type !== 'basic')
							return response;
						if (response.url.startsWith("https://www.seneral.dev/FlagPlayerDev/favicon") ||
							response.url.match(/https:\/\/i.ytimg.com\/vi\/[a-zA-Z0-9_-]{11}\/default\.jpg/))
						caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));

						return response;
					});
			})
		);
	}
});