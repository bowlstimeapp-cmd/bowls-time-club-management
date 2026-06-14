// BowlsTime Service Worker — Web Push handler

self.addEventListener('install', function(event) {
  // Take control immediately, don't wait for old SW to be replaced
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  // Take control of all pages immediately
  event.waitUntil(clients.claim());
});

self.addEventListener('push', function(event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'BowlsTime', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'BowlsTime';
  const options = {
    body: data.body || data.message || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || 'https://app.bowls-time.com' },
  };

  // CRITICAL for iOS Safari: must wrap showNotification in event.waitUntil()
  // so the service worker does not terminate before the notification is shown.
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || 'https://app.bowls-time.com';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
