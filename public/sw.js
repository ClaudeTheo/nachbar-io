// Nachbar.io — Service Worker
// Offline-Fallback, Push-Notifications, Background Sync

const CACHE_NAME = "nachbar-io-v1";
const OFFLINE_URL = "/offline.html";

// Assets die immer gecached werden
const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/manifest.json",
];

// Installation: Assets vorab cachen
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Aktivierung: Alte Caches löschen
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-first mit Cache-Fallback
self.addEventListener("fetch", (event) => {
  // Nur GET-Requests cachen
  if (event.request.method !== "GET") return;

  // API-Calls nicht cachen
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Erfolgreiche Antwort cachen
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline: Aus Cache laden
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match(OFFLINE_URL);
        });
      })
  );
});

// Push-Notification Handler
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body || "Neue Nachricht aus Ihrem Quartier",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    tag: data.tag || "nachbar-io",
    data: {
      url: data.url || "/dashboard",
    },
    actions: [
      { action: "help", title: "Ich helfe!" },
      { action: "later", title: "Später ansehen" },
    ],
    // Vibrationsmuster für Hilfeanfragen
    vibrate: data.urgent ? [200, 100, 200, 100, 200] : [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || "Nachbar.io",
      options
    )
  );
});

// Notification Click Handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/dashboard";

  if (event.action === "help") {
    // "Ich helfe!" — Direkt zum Alert
    event.waitUntil(clients.openWindow(url));
  } else if (event.action === "later") {
    // "Später ansehen" — Notification schließen, nichts tun
    return;
  } else {
    // Standard-Klick: App öffnen
    event.waitUntil(clients.openWindow(url));
  }
});
