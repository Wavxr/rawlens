// public/firebase-messaging-sw.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getMessaging, onBackgroundMessage } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-sw.js";

// ⚠️ Only public config here — safe to expose
const firebaseConfig = {
  apiKey: "AIzaSyDxZokRZdGw3VpCDlfax0tueh1gg-dWbVM",
  authDomain: "rawlens-ph.firebaseapp.com",
  projectId: "rawlens-ph",
  storageBucket: "rawlens-ph.firebasestorage.app",
  messagingSenderId: "543168518515",
  appId: "1:543168518515:web:0da88e50a7f99bf1b74d06",
  measurementId: "G-9SX1CNBTCR"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Handle background messages (when app is not in focus)
onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const isAdmin = payload.data?.type === 'admin' || payload.data?.role === 'admin';

  const notificationTitle = payload.notification?.title || payload.data?.title || 'RawLens';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: isAdmin ? '/admin-badge-72x72.png' : '/icon-192x192.png',
    image: payload.notification?.image || payload.data?.image,
    data: {
      ...payload.data,
      click_action: payload.notification?.click_action || payload.data?.click_action || '/',
      isAdmin
    },
    actions: [
      { action: 'open', title: isAdmin ? 'View Admin Panel' : 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    requireInteraction: isAdmin,
    vibrate: [200, 100, 200],
    tag: isAdmin ? 'admin' : 'default',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Data-only messages (no notification payload)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    if (payload.data && !payload.notification) {
      const data = payload.data;
      const isAdmin = data.type === 'admin' || data.role === 'admin';

      const options = {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: isAdmin ? '/admin-badge-72x72.png' : '/icon-192x192.png',
        data: { click_action: data.click_action, isAdmin, ...data },
        requireInteraction: isAdmin,
        tag: isAdmin ? 'admin' : 'default',
        actions: [{ action: 'open', title: isAdmin ? 'View Admin Panel' : 'Open' }]
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'RawLens', options)
      );
    }
  } catch (err) {
    console.error('Error parsing push payload:', err);
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const isAdmin = event.notification.data?.isAdmin || false;
  const clickAction = event.notification.data?.click_action || '/';
  const targetUrl = isAdmin && !clickAction.includes('/admin')
    ? '/admin' + clickAction
    : clickAction;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              clickAction: targetUrl,
              isAdmin,
              data: event.notification.data
            });
            return;
          }
        }
        return clients.openWindow(targetUrl);
      })
  );
});
