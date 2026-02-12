/**
 * MakonTV Service Worker
 *
 * Strategies:
 *   - App shell (HTML/CSS/JS): Cache-first → always offline-capable
 *   - API data: Network-first → fresh data, fallback to cache
 *   - Images/Posters: Cache-first → fast loads, lazy update
 *   - Videos: Network-only → too large to cache
 */
const CACHE_NAME = 'makontv-v1';
const SHELL_CACHE = 'makontv-shell-v1';
const IMG_CACHE = 'makontv-img-v1';
const API_CACHE = 'makontv-api-v1';

// App shell — always cache these
const SHELL_FILES = [
  '/',
  '/index.html',
  '/api-client.js',
  '/user-actions.js',
  '/auth-client.js',
  '/i18n.js',
  '/manifest.json',
];

// ═══ INSTALL — cache app shell ═══
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => {
      console.log('[SW] Caching app shell');
      return cache.addAll(SHELL_FILES);
    })
  );
  self.skipWaiting();
});

// ═══ ACTIVATE — clean old caches ═══
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => !key.startsWith('makontv-'))
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ═══ FETCH — routing strategies ═══
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip video files — too large to cache
  if (url.pathname.includes('/videos/') || url.pathname.endsWith('.mp4')) return;

  // API requests: Network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request, API_CACHE));
    return;
  }

  // Images/posters: Cache-first
  if (isImageRequest(event.request)) {
    event.respondWith(cacheFirst(event.request, IMG_CACHE));
    return;
  }

  // App shell: Cache-first
  event.respondWith(cacheFirst(event.request, SHELL_CACHE));
});

// ═══ STRATEGIES ═══

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlineFallback();
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || offlineFallback();
  }
}

function offlineFallback() {
  return new Response(
    '<html><body style="background:#0a0a14;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">' +
    '<div style="text-align:center"><h1>MakonTV</h1><p>Нет подключения к интернету</p><p>Проверьте соединение и попробуйте снова</p></div></body></html>',
    { headers: { 'Content-Type': 'text/html' } }
  );
}

function isImageRequest(request) {
  const url = request.url;
  return /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i.test(url) ||
    url.includes('/posters/') ||
    url.includes('/backdrops/') ||
    url.includes('/thumbnails/') ||
    url.includes('/avatars/') ||
    url.includes('r2.dev/');
}

// ═══ PUSH NOTIFICATIONS ═══
self.addEventListener('push', (event) => {
  let data = { title: 'MakonTV', body: 'Новое обновление!' };

  try {
    data = event.data.json();
  } catch {
    data.body = event.data?.text() || data.body;
  }

  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'makontv-notification',
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [
      { action: 'open', title: 'Открыть' },
      { action: 'dismiss', title: 'Закрыть' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      // Focus existing tab if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Open new tab
      return self.clients.openWindow(url);
    })
  );
});

// ═══ BACKGROUND SYNC ═══
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-watch-history') {
    event.waitUntil(syncWatchHistory());
  }
});

async function syncWatchHistory() {
  // Retrieve queued watch history from IndexedDB and POST to API
  // Implemented in auth-client.js when offline
  console.log('[SW] Syncing watch history');
}
