const CACHE_NAME = 'acbat-flow-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Simple pass-through fetch handler to satisfy PWA requirements
    event.respondWith(fetch(event.request));
});
