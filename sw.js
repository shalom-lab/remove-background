const CACHE_NAME = 'rmbg-cache-v1';

// Install event - just initialize the cache
self.addEventListener('install', event => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[Service Worker] Cache initialized');
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        Promise.all([
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME)
                        .map(name => caches.delete(name))
                );
            }),
            self.clients.claim()
        ])
    );
});

// Helper function to handle download progress
const fetchWithProgress = async (request, client) => {
    const response = await fetch(request);
    if (!response || !response.ok) return response;

    const reader = response.body.getReader();
    const contentLength = +response.headers.get('content-length');
    let loaded = 0;

    const stream = new ReadableStream({
        async start(controller) {
            while (true) {
                const {done, value} = await reader.read();
                if (done) break;
                loaded += value.length;
                controller.enqueue(value);
                
                // Send progress to the client
                if (client && contentLength) {
                    client.postMessage({
                        type: 'download_progress',
                        loaded,
                        total: contentLength
                    });
                }
            }
            controller.close();
        }
    });

    return new Response(stream, {
        headers: response.headers,
        status: response.status,
        statusText: response.statusText
    });
};

// Fetch event handler
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Skip non-HTTP(S) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    const isHuggingFace = url.hostname === 'huggingface.co' || url.hostname.endsWith('huggingface.co');

    // For Hugging Face requests, add progress tracking
    if (isHuggingFace) {
        event.respondWith(
            caches.match(event.request).then(async cachedResponse => {
                if (cachedResponse) {
                    console.log('[Service Worker] Serving from cache:', url.toString());
                    return cachedResponse;
                }

                console.log('[Service Worker] Fetching from network:', url.toString());
                const client = await clients.get(event.clientId);
                const networkResponse = await fetchWithProgress(event.request, client);
                
                if (networkResponse && networkResponse.ok) {
                    // Clone the response before caching
                    const responseToCache = networkResponse.clone();
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(event.request, responseToCache);
                }
                return networkResponse;
            })
        );
        return;
    }

    // For all other requests, use simple cache-first strategy
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then(networkResponse => {
                if (networkResponse && networkResponse.ok) {
                    // Clone the response before using it
                    const responseToCache = networkResponse.clone();
                    // Wait for the cache operation to complete
                    return caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                            return networkResponse;
                        });
                }
                return networkResponse;
            });
        })
    );
}); 