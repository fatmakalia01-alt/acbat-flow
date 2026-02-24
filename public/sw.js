const CACHE_NAME = 'acbat-flow-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // PWA requires a fetch handler for installability.
    // By not calling event.respondWith(), we let the browser handle the request naturally.
    // This avoids CORS issues that can occur when the SW simplifies the fetch context.
});
