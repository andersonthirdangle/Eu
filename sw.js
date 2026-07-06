// MOSB · Controle de Horas — Service Worker
// Estratégia: cache-first para o app shell, com atualização em segundo plano (stale-while-revalidate).
// Incremente CACHE_VERSION sempre que publicar uma nova versão do index.html/manifest.

const CACHE_VERSION = "mosb-horas-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

// ── INSTALL: baixa e guarda o app shell ────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ── ACTIVATE: remove caches de versões antigas ─────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: cache-first com atualização em segundo plano ────────────
self.addEventListener("fetch", (event) => {
  // Só trata requisições GET do mesmo site (dados do app ficam no localStorage, não passam por aqui)
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached); // offline: cai no cache se a rede falhar

      // Responde rápido com o cache (se existir) e atualiza em segundo plano
      return cached || fetchPromise;
    })
  );
});

// ── MENSAGENS: permite forçar atualização a partir da página ──────
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") self.skipWaiting();
});
