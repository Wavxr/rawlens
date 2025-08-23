/* public/sw.js */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'RawLens';
    const body = data.body || '';
    const extra = data.data || {};

    const options = {
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      data: extra,
      vibrate: [100, 50, 100],
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'close', title: 'Dismiss' },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    // Fallback
    event.waitUntil(self.registration.showNotification('RawLens', { body: 'You have a new notification.' }));
  }
});

self.addEventListener('notificationclick', (event) => {
  const url = event.notification?.data?.url || '/';
  event.notification.close();

  if (event.action === 'close') return;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        const clientUrl = new URL(client.url);
        if ('focus' in client) {
          await client.focus();
        }
        if (url && clientUrl.pathname !== url && 'navigate' in client) {
          return client.navigate(url);
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })()
  );
});
