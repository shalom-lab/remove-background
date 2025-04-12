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
    
    // Skip non-HTTP(S) requests and chrome-extension requests
    if (!url.protocol.startsWith('http') || 
        url.protocol === 'chrome-extension:' || 
        url.protocol === 'chrome:' ||
        url.protocol === 'chrome-search:' ||
        url.protocol === 'chrome-devtools:' ||
        url.protocol === 'devtools:') {
        return;
    }

    // Skip analytics and other unnecessary requests
    if (url.hostname.includes('google-analytics.com') ||
        url.hostname.includes('doubleclick.net')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(async cachedResponse => {
            if (cachedResponse) {
                console.log('[Service Worker] Serving from cache:', url.toString());
                return cachedResponse;
            }

            console.log('[Service Worker] Fetching from network:', url.toString());
            try {
                const client = await clients.get(event.clientId);
                const networkResponse = await fetchWithProgress(event.request, client);
                
                if (networkResponse && networkResponse.ok) {
                    const responseToCache = networkResponse.clone();
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(event.request, responseToCache);
                }
                return networkResponse;
            } catch (error) {
                console.error('[Service Worker] Fetch error:', error);
                throw error;
            }
        })
    );
}); 