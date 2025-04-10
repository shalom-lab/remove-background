const CACHE_NAME = 'rmbg-cache-v1';
const MODEL_CACHE_NAME = 'rmbg-model-cache-v1';

// Assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.2'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== MODEL_CACHE_NAME)
            .map(name => caches.delete(name))
        );
      }),
      // Take control of all pages immediately
      self.clients.claim()
    ])
  );
});

// Helper function to cache response
const cacheResponse = async (cache, request, response) => {
  if (response && response.status === 200) {
    await cache.put(request, response.clone());
  }
  return response;
};

// Fetch event - serve from cache first, then network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Special handling for model files from Hugging Face
  if (url.hostname === 'huggingface.co' || url.hostname.endsWith('huggingface.co')) {
    event.respondWith(
      caches.open(MODEL_CACHE_NAME)
        .then(cache => 
          // Try cache first
          cache.match(event.request)
            .then(async cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // If not in cache, fetch from network and cache
              try {
                const networkResponse = await fetch(event.request);
                await cacheResponse(cache, event.request, networkResponse);
                return networkResponse;
              } catch (error) {
                console.error('Error fetching model:', error);
                throw error;
              }
            })
        )
    );
    return;
  }

  // Regular static assets - Cache First strategy
  event.respondWith(
    caches.match(event.request)
      .then(async cachedResponse => {
        if (cachedResponse) {
          // Return cached response immediately
          return cachedResponse;
        }
        
        // If not in cache, fetch from network
        try {
          const networkResponse = await fetch(event.request);
          // Cache successful responses
          if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cacheResponse(cache, event.request, networkResponse);
          }
          return networkResponse;
        } catch (error) {
          console.error('Fetch failed:', error);
          throw error;
        }
      })
  );
}); 