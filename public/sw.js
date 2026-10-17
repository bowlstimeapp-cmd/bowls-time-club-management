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
      Promise.all(keys.filter(key => key !== 'bowls-time-push-status').map(key => caches.delete(key)))
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

const notificationIcon = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6995ed6ffddbd0f64bc9d1e8/61b3b45da_BTZoomed.png';
const pushStatusUrl = new URL('/__push_status__', self.location.origin).href;

async function recordPushStatus(status) {
  const cache = await caches.open('bowls-time-push-status');
  await cache.put(pushStatusUrl, new Response(JSON.stringify(status), {
    headers: { 'Content-Type': 'application/json' },
  }));
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  windows.forEach(client => client.postMessage({ type: 'PUSH_STATUS', status }));
}

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'GET_PUSH_STATUS' || !event.ports[0]) return;
  event.waitUntil((async () => {
    const cache = await caches.open('bowls-time-push-status');
    const response = await cache.match(pushStatusUrl);
    event.ports[0].postMessage(response ? await response.json() : null);
  })());
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json() || {};
    } catch {
      data = { body: event.data.text() };
    }
  }
  const receivedAt = new Date().toISOString();

  // Safari requires an immediate visible notification. Never wait for badges,
  // storage or network requests before starting showNotification.
  const display = self.registration.showNotification(data.title || 'Bowls Time', {
    body: data.body || '',
    icon: notificationIcon,
    data: { url: data.url || '/' },
  }).then(
    () => recordPushStatus({ receivedAt, displayedAt: new Date().toISOString() }),
    error => recordPushStatus({ receivedAt, error: error.message || String(error) })
  );

  const badge = (async () => {
    const count = Number(data.unreadCount) || 0;
    if (count > 0 && self.navigator.setAppBadge) await self.navigator.setAppBadge(count);
    else if (self.navigator.clearAppBadge) await self.navigator.clearAppBadge();
  })().catch(error => console.warn('[SW] Badge update failed:', error));

  event.waitUntil(Promise.all([display, badge]));
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
