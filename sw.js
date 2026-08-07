// Grupo Roma — Service Worker
// Cachea solo el "shell" de la app (HTML/manifest/íconos) para que abra
// rápido y funcione offline con el último dato sincronizado.
// Los pedidos a Google Sheets / Apps Script NUNCA se cachean acá —
// siempre van a la red, para que los datos sean siempre los últimos.

const CACHE_NAME = 'grupo-roma-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon-16.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nunca intervenir pedidos a otros dominios (Google Sheets/Apps Script,
  // fuentes, NotebookLM, etc.) — siempre red, siempre datos frescos.
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  // App shell: cache-first, con actualización en segundo plano.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((networkResp) => {
        if (networkResp && networkResp.status === 200) {
          const clone = networkResp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResp;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
