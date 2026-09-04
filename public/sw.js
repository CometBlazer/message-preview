/* Offline cache.
 *
 * Navigations go to the network first so a rebuild actually lands — an
 * installed PWA that serves cached HTML first will happily show you last
 * week's app forever. The cache is the fallback when the network isn't there,
 * which is the case this is for.
 */
const CACHE = "message-preview-v2";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const put = (req, res) => {
  if (res && res.ok && res.type === "basic") {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
};

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network first, cached shell when offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => put(req, res))
        .catch(() =>
          caches.match("/index.html").then((hit) => hit || caches.match("/") || Response.error())
        )
    );
    return;
  }

  // Build output is content-hashed, so it can be served from cache forever.
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res)))
    );
    return;
  }

  // Everything else (icons, manifest, OCR model): serve the cached copy at
  // once, then quietly refresh it for next time.
  e.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => put(req, res))
        .catch(() => hit);
      return hit || network;
    })
  );
});
