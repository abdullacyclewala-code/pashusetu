/**
 * PashuSetu service worker — Part 1.
 * - App shell + previously visited pages: network-first, cache fallback
 *   (so /dashboard/report opens in airplane mode after one visit).
 * - Immutable Next.js static assets + icons: cache-first.
 * The report queue itself lives in IndexedDB (lib/offline) — the SW only
 * makes sure the UI can boot offline.
 */
const SHELL_CACHE = "pashusetu-shell-v2";
const ASSET_CACHE = "pashusetu-assets-v2";
const SHELL = ["/", "/login", "/signup", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // immutable build assets → cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      })
    );
    return;
  }

  // page navigations → network-first, cache fallback when offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(async () => {
          const hit = await caches.match(request);
          return hit || caches.match("/");
        })
    );
  }
});
