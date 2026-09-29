/* Trippin' service worker — keeps the app usable offline on the road.
 *
 * - App shell (navigations): network first, fall back to the cached index.html.
 * - Built assets (/assets/*, icons): cache first — filenames are content-hashed.
 * - Trip data (GET /api/v1/trips…, /profile): network first, cached copy when offline.
 * - Map tiles: cache first with a size cap, so maps you've looked at still render offline.
 * Mutations (POST/PUT/PATCH/DELETE) are never cached. */
const VERSION = "v1";
const SHELL = `shell-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const API = "api-v1";
const TILES = "tiles-v1";
const MAX_TILES = 600;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(["/", "/index.html", "/manifest.webmanifest"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL, ASSETS, API, TILES]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  // Sent on logout so the next person on this device can't read the last user's trips offline.
  if (event.data === "clear-user-data") event.waitUntil(caches.delete(API));
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    await cache.put(request, response.clone());
    if (maxEntries) {
      const keys = await cache.keys();
      if (keys.length > maxEntries) await Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)));
    }
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match("/index.html")) || (await caches.match("/"))),
    );
    return;
  }

  if (url.hostname.endsWith("tile.openstreetmap.org")) {
    event.respondWith(cacheFirst(request, TILES, MAX_TILES));
    return;
  }

  if (url.pathname.includes("/api/v1/")) {
    const cacheable = /\/api\/v1\/(trips|profile|dashboard)/.test(url.pathname) && !url.pathname.includes("/places/search");
    if (cacheable) event.respondWith(networkFirst(request, API));
    return;
  }

  if (url.origin === self.location.origin && (url.pathname.startsWith("/assets/") || /\.(png|ico|webmanifest)$/.test(url.pathname))) {
    event.respondWith(cacheFirst(request, ASSETS));
  }
});
