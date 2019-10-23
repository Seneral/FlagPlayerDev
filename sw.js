const CACHE_NAME =  "flagplayer-cache-1";
const HOST = "https://www.seneral.dev";
const PATH = "/FlagPlayerDev";
var reMainPage = new RegExp(PATH.replace("/", "\\") + "(|\\/|\\/index\\.html)(\\?.*)?$")

self.addEventListener('install', function(event)
{
	event.waitUntil(
		caches.open(CACHE_NAME)
		.then(function(cache)
		{
			return cache.addAll([
				PATH + '/style.css',
				PATH + '/index.html',
				PATH + '/page.js'
			]);
		})
	);
});

self.addEventListener('fetch', function(event)
{
	if (event.request.url.match(reMainPage))
		event.respondWith(caches.match(PATH + "/index.html"));
	else
	{
		event.respondWith(
			caches.match(event.request)
			.then(function(response)
			{
				if (response)
					return response;
				return fetch(event.request).then(
					function(response)
					{
						if (!response || (response.status !== 200 && response.status !== 0) || response.type == 'error')
							return response;
						if (event.request.url.startsWith(HOST + PATH + "/favicon") ||
							event.request.url.match(/https:\/\/i.ytimg.com\/vi\/[a-zA-Z0-9_-]{11}\/default\.jpg/)) 
						{
							var cacheResponse = response.clone();
							caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheResponse));
						}

						return response;
					});
			})
		);
	}
});