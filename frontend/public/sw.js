const CACHE = "mfc-v2";
const OFFLINE_URL = "/offline";

// On install: cache the offline fallback page
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL])),
  );
  self.skipWaiting();
});

// On activate: clean up old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// Fetch: network-first, fall back to cache, then offline page
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // Don't intercept API calls — always network
  if (url.pathname.startsWith("/api") || url.hostname !== self.location.hostname) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache successful page responses
        if (res.ok && e.request.destination === "document") {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(e.request);
        return cached ?? (await caches.match(OFFLINE_URL));
      }),
  );
});
