const CACHE_NAME = 'kanvo-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icon-192x192.svg',
  '/icon-512x512.svg'
];

// Evento 'install': se dispara cuando el service worker se instala.
// Abre la caché y almacena los archivos estáticos de la app (App Shell).
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache abierta, añadiendo App Shell.');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => {
        console.log('Service Worker: App Shell cacheada exitosamente.');
        return self.skipWaiting(); // Forzar al SW a activarse
      })
      .catch(error => {
        console.error('Service Worker: Falló el cacheo del App Shell:', error);
      })
  );
});

// Evento 'activate': se dispara después de la instalación.
// Se usa para limpiar cachés antiguas.
self.addEventListener('activate', event => {
  console.log('Service Worker: Activado.');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Tomar control inmediato de las páginas
});

// Evento 'fetch': se dispara cada vez que la aplicación realiza una petición de red.
// Implementa la estrategia "Cache First".
self.addEventListener('fetch', event => {
  // No interceptar peticiones que no sean GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Si el recurso está en la caché, lo devolvemos desde ahí.
        if (cachedResponse) {
          // console.log('Service Worker: Recurso encontrado en caché:', event.request.url);
          return cachedResponse;
        }

        // Si el recurso no está en la caché, vamos a la red a buscarlo.
        // console.log('Service Worker: Recurso no encontrado en caché, buscando en red:', event.request.url);
        return fetch(event.request)
          .then(networkResponse => {
            // Opcional: podríamos clonar y guardar la respuesta en caché para futuras peticiones,
            // pero la estrategia Cache-First pura solo sirve lo que se cacheó en la instalación.
            return networkResponse;
          })
          .catch(error => {
            console.error('Service Worker: Error al obtener recurso de la red:', error);
            // Aquí se podría devolver una página de fallback offline si se tuviera una.
          });
      })
  );
});
