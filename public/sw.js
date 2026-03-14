// Nachbar.io — Service Worker
// Offline-Fallback, Push-Notifications, API-Caching

const CACHE_NAME = "nachbar-io-v2";
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

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

function shouldCacheApi(url) {
  return CACHEABLE_API_PATHS.some((path) => url.includes(path));
}

async function trimApiCache() {
  const cache = await caches.open(API_CACHE_NAME);
  const keys = await cache.keys();
  if (keys.length > API_CACHE_MAX_ENTRIES) {
    const toDelete = keys.slice(0, keys.length - API_CACHE_MAX_ENTRIES);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = event.request.url;

  if (shouldCacheApi(url)) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);

        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              const responseToCache = networkResponse.clone();
              cache.put(event.request, responseToCache);
              trimApiCache();
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

  if (url.includes("/api/")) return;

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
    self.registration.showNotification(data.title || "Nachbar.io", options)
  );
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
