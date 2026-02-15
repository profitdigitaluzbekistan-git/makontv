/**
 * MakonTV Service Worker v3
 *
 * Strategies:
 *   - ALL requests (HTML, JS, CSS, API): Network-first → always fresh
 *   - Images/Posters: Cache-first → fast loads
 *   - Videos: Network-only → too large to cache
 *
 * Cache is ONLY used as offline fallback, never served over network.
 */
const CACHE_VERSION = 'v6';
const SHELL_CACHE = 'makontv-shell-' + CACHE_VERSION;
const IMG_CACHE = 'makontv-img-' + CACHE_VERSION;

// ═══ INSTALL — skip waiting immediately ═══
self.addEventListener('install', () => {
  self.skipWaiting();
});

// ═══ ACTIVATE — delete ALL old caches, claim clients ═══
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== SHELL_CACHE && key !== IMG_CACHE)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ═══ FETCH — routing strategies ═══
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip video files — too large to cache
  if (url.pathname.includes('/videos/') || url.pathname.endsWith('.mp4')) return;

  // Images/posters: Cache-first (only category that benefits from caching)
  if (isImageRequest(event.request)) {
    event.respondWith(cacheFirst(event.request, IMG_CACHE));
    return;
  }

  // EVERYTHING else (HTML, JS, CSS, API, fonts): Network-first
  // Cache is only used as offline fallback
  event.respondWith(networkFirst(event.request, SHELL_CACHE));
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
  try { data = event.data.json(); } catch { data.body = event.data?.text() || data.body; }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'makontv-notification',
      data: { url: data.url || '/' },
      actions: data.actions || [
        { action: 'open', title: 'Открыть' },
        { action: 'dismiss', title: 'Закрыть' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
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
  console.log('[SW] Syncing watch history');
}
