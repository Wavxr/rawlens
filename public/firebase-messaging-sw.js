// Firebase Messaging Service Worker for background notifications
// This file handles FCM notifications when the app is in the background

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// Note: This config should match your Firebase project
const firebaseConfig = {
  apiKey: "your-api-key", // This will be replaced by the build process
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
};

firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging object
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification?.title || payload.data?.title || 'RawLens';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new notification',
    icon: '/logo.png',
    badge: '/logo.png',
    image: payload.notification?.image || payload.data?.image,
    data: {
      ...payload.data,
      click_action: payload.notification?.click_action || payload.data?.click_action || '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Add this to your service worker:

self.addEventListener('push', function(event) {
  console.log('📱 Push event received:', event);
  
  if (event.data) {
    const payload = event.data.json();
    console.log('📱 Push payload:', payload);
    
    // Handle data-only messages
    if (payload.data) {
      const notificationData = payload.data;
      
      const notificationOptions = {
        body: notificationData.body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        image: notificationData.image || undefined,
        data: {
          click_action: notificationData.click_action,
          type: notificationData.type,
          ...notificationData
        },
        requireInteraction: true,
        actions: [
          {
            action: 'open',
            title: 'Open',
            icon: '/icon-192x192.png'
          }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(
          notificationData.title,
          notificationOptions
        )
      );
    }
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('📱 Notification clicked:', event);
  
  event.notification.close();
  
  const clickAction = event.notification.data?.click_action || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              clickAction: clickAction,
              data: event.notification.data
            });
            return;
          }
        }
        
        // If app is not open, open it
        return clients.openWindow(clickAction);
      })
  );
});

// Handle push events (fallback)
self.addEventListener('push', (event) => {
  if (event.data) {
    console.log('[firebase-messaging-sw.js] Push event received:', event.data.text());
  }
});
