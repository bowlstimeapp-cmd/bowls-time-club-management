self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

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

  // Note: In service worker context, the Badging API is on 'self' not 'navigator'.
  // self.setAppBadge / self.clearAppBadge are the correct SW equivalents.
  const hasBadgeAPI = 'setAppBadge' in self;
  console.log('[SW] setAppBadge available on self:', hasBadgeAPI);

  event.waitUntil(
    (async () => {
      // Update app icon badge
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
        vibrate: [200, 100, 200]
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
