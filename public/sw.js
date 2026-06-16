// Service Worker — Network-first strategy.
// Always serve the latest version from the network when online.
// No app shell or asset caching — freshness is prioritised.

self.addEventListener('install', () => {
  // Activate immediately without waiting for existing tabs to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of all open clients immediately
  event.waitUntil(
    // Clear any previously cached data from old SW versions
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Network-first fetch: always try the network, never serve stale cache.
// For navigation requests, fall back gracefully so the PWA doesn't freeze.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request).catch(() => {
      // Offline fallback for navigation — return a minimal offline page
      if (event.request.mode === 'navigate') {
        return new Response(
          '<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>You are offline</h2><p>Please check your connection and try again.</p><button onclick="location.reload()">Retry</button></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
      // For other requests (assets, API), just fail gracefully
      return new Response('', { status: 503 });
    })
  );
});

// ── Push Notifications ────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');

  let data = { title: 'New notification', body: '', url: '/' };
  if (event.data) {
    try {
      data = event.data.json();
      console.log('[SW] Push payload parsed:', data);
    } catch {
      data.body = event.data.text();
      console.log('[SW] Push payload as text:', data.body);
    }
  } else {
    console.log('[SW] Push event had no data');
  }

  const unreadCount = data.unreadCount || 0;
  console.log('[SW] unreadCount from payload:', unreadCount);

  const hasBadgeAPI = 'setAppBadge' in self;
  console.log('[SW] setAppBadge available on self:', hasBadgeAPI);

  event.waitUntil(
    (async () => {
      if (hasBadgeAPI) {
        try {
          if (unreadCount > 0) {
            await self.setAppBadge(unreadCount);
            console.log('[SW] Badge set to', unreadCount);
          } else {
            await self.clearAppBadge();
            console.log('[SW] Badge cleared');
          }
        } catch (err) {
          console.error('[SW] Badge update failed:', err);
        }
      } else {
        console.log('[SW] Badging API not available in this SW context');
      }

      await self.registration.showNotification(data.title, {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url: data.url || '/' },
        vibrate: [200, 100, 200],
      });

      console.log('[SW] Notification shown');
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
