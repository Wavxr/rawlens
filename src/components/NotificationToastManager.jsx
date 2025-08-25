import React, { useState, useEffect } from 'react';
import { onMessage } from 'firebase/messaging';
import { messaging } from '../lib/firebaseClient';
import NotificationToast from './NotificationToast';

export const NotificationToastManager = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!messaging || !('Notification' in window)) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('📨 Foreground notification received:', payload);
      
      // Add to toast queue
      const notification = {
        id: Date.now() + Math.random(),
        data: payload.data,
        timestamp: new Date()
      };

      setNotifications(prev => [...prev, notification]);

      // Also try to show browser notification (fallback)
      if (Notification.permission === 'granted') {
        try {
          const browserNotification = new Notification(
            payload.data?.title || 'RawLens', 
            {
              body: payload.data?.body,
              icon: '/logo.png',
              badge: '/logo.png',
              tag: payload.data?.type === 'admin' ? 'admin' : 'user',
              silent: true // Don't make sound since we're showing toast
            }
          );

          browserNotification.onclick = () => {
            window.focus();
            if (payload.data?.click_action) {
              window.location.href = payload.data.click_action;
            }
            browserNotification.close();
          };
        } catch (error) {
          console.log('Browser notification failed, showing toast only');
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {notifications.map((notification, index) => (
        <div 
          key={notification.id}
          style={{ 
            transform: `translateY(${index * 100}px)`,
            pointerEvents: 'auto'
          }}
        >
          <NotificationToast
            notification={notification}
            onDismiss={() => removeNotification(notification.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default NotificationToastManager;