const CACHE_NAME = "animepulse-v4";
const ASSETS = [
  "./index.html",
  "./style.css",
  "./app.js",
  "./monetization-config.js",
  "./icon-data.js",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Les appels à l'API AniList doivent toujours aller chercher des
  // données fraîches sur le réseau, jamais depuis le cache.
  if (event.request.url.includes("graphql.anilist.co")) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
