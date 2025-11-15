// Digital Menu Service Worker

const CACHE_NAME = "digital-menu-cache-v2";
const urlsToCache = [
  "/",
  "/index.html",
  "/admin.html",
  "/admin-login.html",
  "/admin-simple.html",
  "/api-service.js",
  "/admin-auth.js",
  "/admin.js",
  "/styles.css",
  "/admin-styles.css",
  "/manifest.json",
  "/assets/images/icon-192x192.png",
  "/assets/images/icon-512x512.png",
  "/offline.html",
];

// Install event - cache basic assets with error handling
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Caching Files");

        // Instead of using addAll (which fails if any file fails),
        // we'll add each file individually and handle errors
        return Promise.all(
          urlsToCache.map((url) => {
            return fetch(url)
              .then((response) => {
                if (!response.ok) {
                  throw new Error(`Failed to fetch ${url}`);
                }
                return cache.put(url, response);
              })
              .catch((error) => {
                console.log(`Caching failed for ${url}: ${error.message}`);
                // Continue despite this error
                return Promise.resolve();
              });
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activated");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log("Service Worker: Clearing Old Cache");
              return caches.delete(cache);
            }
            return Promise.resolve();
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - network first with cache fallback
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip cross-origin requests
  if (requestUrl.origin !== location.origin) {
    return;
  }

  // For non-GET requests, just pass through to the network without caching
  if (event.request.method !== "GET") {
    event.respondWith(fetch(event.request));
    return;
  }

  // Handle image requests with cache-first strategy
  if (requestUrl.pathname.startsWith("/assets/images/")) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return (
          cachedResponse ||
          fetch(event.request)
            .then((response) => {
              // Cache the fetched image for future
              return caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, response.clone());
                return response;
              });
            })
            .catch(() => {
              // For image requests that fail, you could return a default image
              return caches.match("/assets/images/default-product.jpg");
            })
        );
      })
    );
    return;
  }

  // For other GET requests, use network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        // Cache the latest response
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match("/offline.html");
        });
      })
  );
});
