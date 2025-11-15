// Digital Menu Service Worker

const CACHE_NAME = "digital-menu-cache-v5"; // Increment cache version
const urlsToCache = [
  "/",
  "/public/pages/index.html",
  "/admin/admin.html",
  "/admin/admin-login.html",
  "/admin/js/api-service.js",
  "/admin/js/admin-auth.js",
  "/admin/js/admin.js",
  "/admin/css/admin.css",
  "/manifest.json",
  "/assets/images/icon-192x192.png",
  "/assets/images/icon-512x512.png",
  "/offline.html",
];

// Install event - cache basic assets with error handling
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
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
    // Don't call skipWaiting here to prevent immediate activation
    // This helps prevent reload loops
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
      // Only claim clients after cleanup is done
      .then(() => self.clients.claim())
  );
});

// Listen for messages from clients
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CHECK_FOR_UPDATES") {
    console.log("Service Worker: Checking for updates by request");

    // Don't automatically skipWaiting here
    // Instead, notify clients that an update is available
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: "UPDATE_AVAILABLE" });
      });
    });
  }

  // Add explicit update and reload command
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch event - network first with cache fallback
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip cross-origin requests and data URLs
  if (
    requestUrl.origin !== location.origin ||
    requestUrl.href.startsWith("data:")
  ) {
    return;
  }

  // For non-GET requests, just pass through to the network without caching
  if (event.request.method !== "GET") {
    event.respondWith(
      fetch(event.request).catch((error) => {
        console.error("Fetch failed for non-GET request:", error);
        return new Response(
          JSON.stringify({ error: "Network request failed" }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      })
    );
    return;
  }

  // Special handling for admin.html to prevent reload loops
  if (
    requestUrl.pathname.endsWith("/admin.html") ||
    requestUrl.pathname.endsWith("/admin/admin.html")
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Handle image requests with cache-first strategy
  if (requestUrl.pathname.startsWith("/assets/images/")) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Add a timeout to network requests to prevent hanging
        return Promise.race([
          fetch(event.request).then((response) => {
            if (!response || !response.ok) {
              throw new Error("Network response was not ok");
            }
            // Cache the fetched image for future
            const responseClone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseClone);
              })
              .catch((err) => console.error("Image caching error:", err));
            return response;
          }),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Network request timeout")),
              10000
            )
          ),
        ]).catch(() => {
          // For image requests that fail, return a default image
          return caches
            .match("/assets/images/default-product.jpg")
            .catch(() => new Response("Image not available", { status: 404 }));
        });
      })
    );
    return;
  }

  // For API requests, don't cache but handle timeouts
  if (requestUrl.pathname.includes("/api/")) {
    event.respondWith(
      Promise.race([
        fetch(event.request.clone(), {
          // Include credentials for CORS requests if needed
          credentials: "include",
          // Don't follow redirects automatically
          redirect: "manual",
          // Set a longer timeout for slow connections
          cache: "no-store",
        })
          .then((response) => {
            // Return the successful response
            return response;
          })
          .catch((error) => {
            console.error("API fetch error:", error);

            // Check if we're offline
            return navigator.onLine
              ? new Response(
                  JSON.stringify({
                    error: "API request failed",
                    message: "Server unavailable or request error",
                    offline: false,
                    details: error.message,
                  }),
                  {
                    status: 503,
                    headers: {
                      "Content-Type": "application/json",
                      "Cache-Control": "no-store",
                    },
                  }
                )
              : new Response(
                  JSON.stringify({
                    error: "API request failed",
                    message: "You are currently offline",
                    offline: true,
                  }),
                  {
                    status: 503,
                    headers: {
                      "Content-Type": "application/json",
                      "Cache-Control": "no-store",
                    },
                  }
                );
          }),
        // Set a timeout to prevent hanging requests (30 seconds for slower connections)
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("API request timeout")), 30000)
        ),
      ]).catch((error) => {
        console.error("API request failed or timed out:", error);

        return new Response(
          JSON.stringify({
            error: "API request failed",
            message: error.message || "Request timed out or failed",
            offline: !navigator.onLine,
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          }
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
        caches
          .open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseClone);
          })
          .catch((err) => console.error("Caching error:", err));

        return response;
      })
      .catch((error) => {
        console.log("Fetch failed, falling back to cache:", error);

        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // If no cached response, return the offline page for HTML requests
          if (
            event.request.headers.get("accept") &&
            event.request.headers.get("accept").includes("text/html")
          ) {
            return caches.match("/offline.html").then((offlineResponse) => {
              if (offlineResponse) {
                return offlineResponse;
              }
              // If offline.html is not in cache either, return a simple error response
              return new Response(
                "You are offline and the app is not fully cached. Please try again when online.",
                {
                  status: 503,
                  headers: { "Content-Type": "text/plain" },
                }
              );
            });
          }

          // For other resources return a simple error response
          return new Response(
            JSON.stringify({
              error: "Resource unavailable",
              message: "You are offline and this resource is not cached",
              offline: true,
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            }
          );
        });
      })
  );
});
