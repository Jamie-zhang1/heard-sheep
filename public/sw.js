const CACHE_NAME = "heard-sheep-static-v0.6.0";
const APP_BASE_PATH = "/sheep";

const PRECACHE_URLS = [
  `${APP_BASE_PATH}/manifest.json`,
  `${APP_BASE_PATH}/favicon.png`,
  `${APP_BASE_PATH}/apple-touch-icon.png`,
  `${APP_BASE_PATH}/icons/icon-192.png`,
  `${APP_BASE_PATH}/icons/icon-512.png`,
  `${APP_BASE_PATH}/icons/icon-maskable-192.png`,
  `${APP_BASE_PATH}/icons/icon-maskable-512.png`,
  `${APP_BASE_PATH}/brand/sheep/mascot/sheep-mascot-main.png`,
  `${APP_BASE_PATH}/brand/sheep/ui/sheep-thinking.png`,
  `${APP_BASE_PATH}/brand/sheep/ui/sheep-question.png`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith(`${APP_BASE_PATH}/api/`)) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request));
    return;
  }

  const cacheableStatic =
    url.pathname.includes("/_next/static/") ||
    url.pathname.startsWith(`${APP_BASE_PATH}/icons/`) ||
    url.pathname.startsWith(`${APP_BASE_PATH}/brand/`) ||
    url.pathname === `${APP_BASE_PATH}/manifest.json` ||
    url.pathname.endsWith("/favicon.png") ||
    url.pathname.endsWith("/apple-touch-icon.png");

  if (!cacheableStatic) return;

  event.respondWith(staleWhileRevalidate(request));
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone()).catch(() => undefined);
      }
      return response;
    })
    .catch(() => cached);

  return cached || network;
}
