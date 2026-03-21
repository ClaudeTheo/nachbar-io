// Nachbar.io — Service Worker
// Performance-Caching (Cache-first fuer Static Assets), Offline-Fallback, Push-Notifications

const CACHE_NAME = "nachbar-io-v3";
const STATIC_CACHE_NAME = "nachbar-io-static-v1";
const API_CACHE_NAME = "nachbar-io-api-v1";
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  "/manifest.json",
  "/offline.html",
];

const CACHEABLE_API_PATHS = [
  "/api/care/medications",
  "/api/care/checkin/status",
  "/api/care/sos",
  "/api/alerts",
];

const API_CACHE_MAX_ENTRIES = 50;
const STATIC_CACHE_MAX_ENTRIES = 200;

// Static Assets: Cache-first (haben Content-Hash im Dateinamen, aendern sich nie)
function isStaticAsset(url) {
  return url.includes("/_next/static/") ||
    url.includes("/icons/") ||
    url.endsWith(".svg") ||
    url.endsWith(".woff2") ||
    url.endsWith(".woff") ||
    url.endsWith(".png") ||
    url.endsWith(".jpg") ||
    url.endsWith(".ico");
}

// Navigations-Requests (HTML-Seiten)
function isNavigationRequest(request) {
  return request.mode === "navigate" ||
    (request.method === "GET" && request.headers.get("accept")?.includes("text/html"));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const VALID_CACHES = [CACHE_NAME, STATIC_CACHE_NAME, API_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !VALID_CACHES.includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

function shouldCacheApi(url) {
  return CACHEABLE_API_PATHS.some((path) => url.includes(path));
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = event.request.url;

  // 1) Static Assets: Cache-first (JS/CSS-Bundles mit Content-Hash, Bilder, Fonts)
  //    Sofort aus Cache, kein Netzwerk noetig — macht den Pi schnell
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) return cachedResponse;

        const networkResponse = await fetch(event.request);
        if (networkResponse.ok) {
          cache.put(event.request, networkResponse.clone());
          event.waitUntil(trimCache(STATIC_CACHE_NAME, STATIC_CACHE_MAX_ENTRIES));
        }
        return networkResponse;
      })
    );
    return;
  }

  // 2) API-Caching: Stale-while-revalidate (sofort aus Cache, Update im Hintergrund)
  if (shouldCacheApi(url)) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);

        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
              event.waitUntil(trimCache(API_CACHE_NAME, API_CACHE_MAX_ENTRIES));
            }
            return networkResponse;
          })
          .catch(() => {
            return cachedResponse || new Response(
              JSON.stringify({ error: "Offline", cached: false }),
              { status: 503, headers: { "Content-Type": "application/json" } }
            );
          });

        if (cachedResponse) {
          event.waitUntil(fetchPromise);
          return cachedResponse;
        }

        return fetchPromise;
      })
    );
    return;
  }

  // 3) Andere API-Calls: nicht cachen
  if (url.includes("/api/")) return;

  // 4) Seitennavigation: Stale-while-revalidate (sofort aus Cache, Update im Hintergrund)
  if (isNavigationRequest(event.request)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);

        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            return cachedResponse || caches.match(OFFLINE_URL);
          });

        // Sofort aus Cache liefern, Update im Hintergrund
        if (cachedResponse) {
          event.waitUntil(fetchPromise);
          return cachedResponse;
        }

        return fetchPromise;
      })
    );
    return;
  }

  // 5) Alles andere: Network-first mit Cache-Fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match(OFFLINE_URL);
        });
      })
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const safeUrl = (typeof data.url === "string" && data.url.startsWith("/")) ? data.url : "/dashboard";

  const options = {
    body: data.body || "Neue Nachricht aus Ihrem Quartier",
    icon: "/icons/icon-192x192.svg",
    badge: "/icons/icon-72x72.svg",
    tag: data.tag || "nachbar-io",
    data: { url: safeUrl },
    actions: [
      { action: "help", title: "Ich helfe!" },
      { action: "later", title: "Spaeter ansehen" },
    ],
    vibrate: data.urgent ? [200, 100, 200, 100, 200] : [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "QuartierApp", options)
  );
});

// Update-Steuerung: Client kann SKIP_WAITING senden, um wartenden SW zu aktivieren
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const rawUrl = event.notification.data?.url || "/dashboard";
  const url = (typeof rawUrl === "string" && rawUrl.startsWith("/")) ? rawUrl : "/dashboard";

  if (event.action === "help") {
    event.waitUntil(clients.openWindow(url));
  } else if (event.action === "later") {
    return;
  } else {
    event.waitUntil(clients.openWindow(url));
  }
});
