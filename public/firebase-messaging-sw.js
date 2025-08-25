// public/firebase-messaging-sw.js

// Load Firebase libraries
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

// Initialize Firebase (only public keys, safe)
firebase.initializeApp({
  apiKey: "AIzaSyDxZokRZdGw3VpCDlfax0tueh1gg-dWbVM",
  authDomain: "rawlens-ph.firebaseapp.com",
  projectId: "rawlens-ph",
  storageBucket: "rawlens-ph.firebasestorage.app",
  messagingSenderId: "543168518515",
  appId: "1:543168518515:web:0da88e50a7f99bf1b74d06",
  measurementId: "G-9SX1CNBTCR"
});

const messaging = firebase.messaging();

// Background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const isAdmin = payload.data?.type === 'admin' || payload.data?.role === 'admin';

  const notificationTitle = payload.notification?.title || payload.data?.title || 'RawLens';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new notification',
    icon: '/logo.png',
    badge: '/logo.png',
    data: { ...payload.data, click_action: payload.data?.click_action || '/', isAdmin },
    actions: [
      { action: 'open', title: isAdmin ? 'View Admin Panel' : 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    requireInteraction: isAdmin,
    vibrate: [200, 100, 200],
    tag: isAdmin ? 'admin' : 'user',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Notification clicks
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
});
