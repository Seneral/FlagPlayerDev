const CACHE_NAME =  "flagplayer-cache-1";
const BASE = "https://www.seneral.dev/FlagPlayerDev";
var reMainPage = new RegExp(BASE.replace("/", "\\") + "(|\\/|\\/index\\.html)(\\?.*)?$")

self.addEventListener('install', function(event)
{
	event.waitUntil(
		caches.open(CACHE_NAME)
		.then(function(cache)
		{
			return cache.addAll([
				"./style.css",
				"./index.html",
				"./page.js"
			]);
		})
	);
});

self.addEventListener('fetch', function(event)
{
	var url = event.request.url;
	if (url.match(reMainPage))
		event.respondWith(caches.match("./index.html"));
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
						if (url.startsWith(BASE + "/favicon") ||
							url.match(/https:\/\/i.ytimg.com\/vi\/[a-zA-Z0-9_-]{11}\/default\.jpg/)) 
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