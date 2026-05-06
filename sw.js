/* Basic SW for offline shell caching (PWA Admin). */
const CACHE_NAME = "sgiptv-admin-v1";
const URLS = [
  "/admin.html",
  "/admin.js",
  "/cliente.css",
  "/style.css",
  "/favicon.ico",
  "/assets/logo.png",
  "/assets/pwa/admin-192.png",
  "/assets/pwa/admin-512.png",
  "/login.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});

