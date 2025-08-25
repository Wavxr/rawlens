// src/hooks/usePushNotifications.js
import { useState, useEffect, useCallback } from 'react';
import { 
  isPushSupported, 
  requestNotificationPermission, 
  registerPushForUser 
} from '../services/pushService';
import { 
  deactivateCurrentDeviceToken,
  updatePushNotificationSetting,
  debouncedRefreshUserToken 
} from '../utils/tokenLifecycle';
import { onMessage } from 'firebase/messaging';
import { messaging } from '../lib/firebaseClient';

export const usePushNotifications = (userId, role = 'user') => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isProcessing, setIsProcessing] = useState(false);

  // Check browser support and current permission status
  useEffect(() => {
    setIsSupported(isPushSupported());
    if (isPushSupported()) {
      setPermission(Notification.permission);
    }
  }, []);

  // Refresh token on userId change (login/logout)
  useEffect(() => {
    if (userId && isSupported && Notification.permission === 'granted') {
      debouncedRefreshUserToken(userId, role);
    }
  }, [userId, role, isSupported]);

  /**
   * Handle enabling push notifications
   * - Checks current permission state
   * - Requests permission if needed
   * - Registers FCM token if permission granted
   * - Updates user settings
   */
  const enablePushNotifications = useCallback(async () => {
    if (!isSupported || !userId) {
      return { success: false, reason: 'not_supported' };
    }

    setIsProcessing(true);

    try {
      // Check current permission
      const currentPermission = Notification.permission;
      setPermission(currentPermission);

      if (currentPermission === 'denied') {
        setIsProcessing(false);
        return { success: false, reason: 'permission_denied' };
      }

      if (currentPermission === 'default') {
        // Request permission
        const granted = await requestNotificationPermission();
        setPermission(Notification.permission);
        
        if (!granted) {
          setIsProcessing(false);
          return { success: false, reason: 'permission_denied' };
        }
      }

      // Permission is granted, register FCM token
      const registered = await registerPushForUser(userId, role);
      
      if (registered) {
        // Update user settings
        await updatePushNotificationSetting(userId, true, role);
        setIsProcessing(false);
        return { success: true };
      } else {
        setIsProcessing(false);
        return { success: false, reason: 'token_registration_failed' };
      }
    } catch (error) {
      console.error('❌ Error enabling push notifications:', error);
      setIsProcessing(false);
      return { success: false, reason: 'error', error };
    }
  }, [isSupported, userId, role]);

  /**
   * Handle disabling push notifications
   * - Deactivates only the current device's FCM token
   * - Updates user settings
   */
  const disablePushNotifications = useCallback(async () => {
    if (!userId) return { success: false };

    setIsProcessing(true);
    try {
      // Update settings (this will also call deactivateCurrentDeviceToken)
      await updatePushNotificationSetting(userId, false, role);
      
      setIsProcessing(false);
      return { success: true };
    } catch (error) {
      console.error('❌ Error disabling push notifications:', error);
      setIsProcessing(false);
      return { success: false, error };
    }
  }, [userId, role]);

  return {
    isSupported,
    permission,
    isProcessing,
    enablePushNotifications,
    disablePushNotifications
  };
};

/**
 * Custom hook to handle foreground notifications using Firebase
 */
export function useForegroundNotifications() {
  useEffect(() => {
    if (!messaging || !('Notification' in window)) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('📨 Foreground notification:', payload);
      
      // Show notification when app is open
      if (Notification.permission === 'granted') {
        const isAdmin = payload.data?.type === 'admin';
        
        const notification = new Notification(payload.data?.title || 'RawLens', {
          body: payload.data?.body,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: isAdmin ? 'admin' : 'user',
        });

        notification.onclick = () => {
          window.focus();
          if (payload.data?.click_action) {
            window.location.href = payload.data.click_action;
          }
          notification.close();
        };
      }
    });

    return () => unsubscribe();
  }, []);
}