var VERSION = 1;
var APP_CACHE = "flagplayer-cache-1";
var IMG_CACHE = "flagplayer-thumbs";
var MEDIA_CACHE = "flagplayer-media";
var BASE = location.href.substring(0, location.href.lastIndexOf("/"));
var reMainPage = new RegExp(BASE.replace("/", "\\/") + "(|\\/|\\/index\\.html)(\\?.*)?$")
var database;
var dbLoading = false;
var dbPromises = [];
var dbCacheRequest;

// Database access - minimal, no error handling, since it's only readonly and assumes a working database management on the main site
function db_access() {
	return new Promise(function(accept, reject) {
		if (!indexedDB) reject();
		else if (database) accept(database);
		else {
			dbPromises.push(accept);
			if (dbLoading) return;
			dbLoading = true;
			// Open
			var request = indexedDB.open("ContentDatabase");
			request.onerror = reject;
			request.onsuccess = function(e) { // Ready
				database = e.target.result;
				database.onerror = reject;
				database.onclose = () => database = undefined;
				dbLoading = false;
				dbPromises.forEach((acc) => acc(database));
				dbPromises = [];
			};
		}
	});
}

function db_hasVideo(videoID) {
	return new Promise(function(accept, reject) {
		db_access().then(function(db) {
			var request = db.transaction("videos", "readonly").objectStore("videos").get(videoID);
			request.onerror = reject;
			request.onsuccess = function(e) {
				if (e.target.result) accept();
				else reject();
			};
		}).catch(reject);
	});
}

self.addEventListener('install', function(event) {
	event.waitUntil(
		caches.open(APP_CACHE)
		.then(function(cache) {
			return cache.addAll([
				"./style.css",
				"./index.html",
				"./page.js"
			]);
		})
	);
});
self.addEventListener('activate', function(event) {
	event.waitUntil(
		// Delete unused stuff (most likely not whole caches, but keys in caches)
		caches.keys().then(keys => Promise.all(
			keys.map(key => {
				if (key.startsWith("flagplayer-cache-") && key != APP_CACHE)
					return caches.delete(key);
			})
		))
	);
});

self.addEventListener('message', function(event) {
	if (event.data.action === 'skipWaiting') {
		self.skipWaiting();
	}
	else if (event.data.action === 'cacheRequest') {
		console.log("Received Cache Request: ", event.data);
		dbCacheRequest = event.data;
	}
});

self.addEventListener('fetch', function(event) {
	var url = event.request.url;
	if (event.request.headers.get('range')) {
		var pos = Number(/^bytes\=(\d+)\-$/g.exec(event.request.headers.get('range'))[1]);
		console.log('Range request for starting position:' + pos + " for stream " + url);
	}
	if (url.match(reMainPage)) {
		// Always use cached app html
		event.respondWith(caches.match("./index.html"));
	}
	else if (dbCacheRequest && dbCacheRequest.streamURL.startsWith(url)) {
		// Currently caching: Cache request in the media cache
		var fetchPos = Number(/^bytes\=(\d+)\-$/g.exec(event.request.headers.get('range'))[1]);
		console.log('Caching range:', fetchPos);
		event.respondWith(
			fetch(event.request)
			.then(function(response) {
				// Initiate caching of received response
				response.clone().arrayBuffer()
				.then(function(fetchData) {
					caches.open("flagplayer-media")
					.then(function(cache) {
						return cache.match(url)
						.then(function(cacheMatch) {
							if (cacheMatch) {
								console.log('Existing cache match:', cacheMatch);
								var cachePos = Number(/^bytes\=(\d+)\-$/g.exec(cacheMatch.request.headers.get('range'))[1]);
								console.log('Existing cache range:', cachePos);

								cacheMatch.arrayBuffer()
								.then(function(cacheData) {
									console.log("Combine cache pos " + cachePos + " length " + cacheData.length +
										" with new pos " + fetchPos + " length " + fetchData.length);
									dbCacheRequest.progress = Math.min(cacheData.length, fetchPos + fetchData.length); // TODO: Add support for holes in array
									// Stich data together
									var combinedData = new ArrayBuffer(Math.max(cacheData.length, fetchPos+fetchData.length));
									var combinedArray = new Int32Array(combinedData);
									var cacheArray = new Int32Array(cacheData);
									var fetchArray = new Int32Array(fetchData);
									combinedArray.set(cacheArray, 0);
									combinedArray.set(fetchArray, fetchPos);
									// Write to cache
									var newCache = new Response(combinedData);
									cache.put(dbCacheRequest.cacheURL, newCache);
								});
							}
							else {
								console.log("Initializing media cache with pos " + fetchPos + " lenght " + fetchData.length);
								dbCacheRequest.progress = fetchPos + fetchData.length; // TODO: Add support for holes in array
								if (fetchPos != 0) {
									console.error("Fetch pos not 0 on first load!");
								}
								var newCache = new Response(fetchData);
								cache.put(dbCacheRequest.cacheURL, newCache);
							}
						});
					});
				});
				// Return response
				return response;
			})
		);

	}
	else if (url.includes("/mediacache/vd-")) {
		// Try to read it from the media cache
		var pos = Number(/^bytes\=(\d+)\-$/g.exec(event.request.headers.get('range'))[1]);
		console.log('Range request for starting position:', pos);
		event.respondWith(
			caches.open("flagplayer-media")
			.then(function(cache) {
				return cache.match(url);
			}).then(function(cacheData) {
				if (cacheData)
					return cacheData.arrayBuffer();
				return fetch(event.request).then(function(fetchData) {
					return fetchData.arrayBuffer();
				});
			}).then(function(byteData) {
				return new Response(byteData.slice(pos), {
					status: 206,
					statusText: 'Partial Content',
					headers: [
						// ['Content-Type', 'video/webm'],
						['Content-Range', 'bytes ' + pos + '-' +
							(byteData.byteLength - 1) + '/' + byteData.byteLength
						]
					]
				});
			})
		);
	}
	else {
		event.respondWith(
			caches.match(event.request)
			.then(function(response) {
				// From cache
				if (response) return response;
				// Fetch from net
				return fetch(event.request).then(function(response) {
					if (!response || (response.status !== 200 && response.status !== 0) || response.type == 'error')
						return response;
					// Cache if desired
					if (url.startsWith(BASE + "/favicon")) {
						var cacheResponse = response.clone();
						caches.open(APP_CACHE).then((cache) => cache.put(event.request, cacheResponse));
					}
					else {
						var thumb = url.match(/https:\/\/i.ytimg.com\/vi\/([a-zA-Z0-9_-]{11})\/default\.jpg/);
						if (thumb) {
							var cacheResponse = response.clone();
							db_hasVideo(thumb[1]).then(function() { // Video stored, cache thumbnail
								caches.open(IMG_CACHE).then((cache) => cache.put(event.request, cacheResponse));
							}).catch(function() {});
						}
					}
					return response;
				});
			})
		);
	}
});