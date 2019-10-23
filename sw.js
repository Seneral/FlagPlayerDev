const CACHE_NAME =  "flagplayer-cache-1";
const BASE = "https://www.seneral.dev/FlagPlayerDev";
var reMainPage = new RegExp(BASE.replace("/", "\\") + "(|\\/|\\/index\\.html)(\\?.*)?$")
var database;
var dbLoading = false;
var dbPromises = [];


function db_access () {
	return new Promise (function (accept, reject) {
		if (!('indexedDB' in window)) {
			reject();
			return;
		}
		if (database != undefined) {
			accept(database);
			return;
		}
		// Only start one request at a time
		dbPromises.push(accept);
		if (dbLoading) return;
		dbLoading = true;
		// Start request
		var request = indexedDB.open("ContentDatabase", 1);
		request.onerror = function (e) { // Denied
			console.error("Failed to open Database!", e);
		};
		request.onsuccess = function (e) { // Ready
			database = e.target.result;
			db_database.onerror = function (e) { // Setup database-wide error handling
				console.error("Database Error:", e);
			};
			db_database.onclose = function (e) { // Setup database-wide error handling
				console.error("Database Closed Unexpectedly!", e);
				database = undefined;
			};
			dbLoading = false;
			dbPromises.forEach((acc) => acc(database));
			dbPromises = [];
		};
	});
}
function db_hasVideo (videoID) {
	return new Promise (function (accept, reject) {
		db_access().then (function (db) {
			var videoTransaction = db.transaction("videos", "read");
			var videoStore = videoTransaction.objectStore("videos");
			var videoRequest = videoStore.get(videoID);
			videoRequest.onsuccess = function (e) {
				accept();
			};
			videoRequest.onerror = function (e) {
				reject();
			};
			
		}).catch (function () {
			reject();
		});
	});
}

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
						
						var cache = function () {
							var cacheResponse = response.clone();
							caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheResponse));
						};
						if (url.startsWith(BASE + "/favicon")) cache();
						var match = url.match(/https:\/\/i.ytimg.com\/vi\/([a-zA-Z0-9_-]{11})\/default\.jpg/);
						if (match) {
							db_hasVideo(match[1]).then(function () {
								console.log("Caching id " + match[1]);
								cache();
							}).catch(function () {
								console.log("Not caching id " + match[1]);
							});
						}
						return response;
					});
			})
		);
	}
});