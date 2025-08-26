// src/hooks/usePushNotifications.js
import { useState, useEffect, useCallback } from 'react';
import { 
  isPushSupported, 
  requestNotificationPermission, 
  registerUserPushNotifications,
  registerAdminPushNotifications
} from '../services/pushService';
import { 
  deactivateCurrentUserDeviceToken,
  deactivateCurrentAdminDeviceToken,
  updatePushNotificationSetting,
  debouncedRefreshUserToken 
} from '../utils/tokenLifecycle';

export const usePushNotifications = (userId, userRole = 'user') => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setIsSupported(isPushSupported());
    if (isPushSupported()) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (userId && isSupported && Notification.permission === 'granted') {
      debouncedRefreshUserToken(userId, userRole);
    }
  }, [userId, userRole, isSupported]);

  /**
   * Context-aware push notification enabling
   */
  const enablePushNotifications = useCallback(async () => {
    if (!isSupported || !userId) {
      return { success: false, reason: 'not_supported' };
    }

    setIsProcessing(true);

    try {
      const currentPermission = Notification.permission;
      setPermission(currentPermission);

      if (currentPermission === 'denied') {
        setIsProcessing(false);
        return { success: false, reason: 'permission_denied' };
      }

      if (currentPermission === 'default') {
        const granted = await requestNotificationPermission();
        setPermission(Notification.permission);
        
        if (!granted) {
          setIsProcessing(false);
          return { success: false, reason: 'permission_denied' };
        }
      }

      let registered;
      if (userRole === 'admin') {
        registered = await registerAdminPushNotifications(userId);
      } else {
        registered = await registerUserPushNotifications(userId);
      }
      
      if (registered) {
        await updatePushNotificationSetting(userId, true, userRole);
        setIsProcessing(false);
        return { success: true };
      } else {
        setIsProcessing(false);
        return { success: false, reason: 'token_registration_failed' };
      }
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      setIsProcessing(false);
      return { success: false, reason: 'error', error };
    }
  }, [isSupported, userId, userRole]);

  /**
   * Context-aware push notification disabling
   */
  const disablePushNotifications = useCallback(async () => {
    if (!userId) return { success: false };

    setIsProcessing(true);
    try {
      await updatePushNotificationSetting(userId, false, userRole);
      
      setIsProcessing(false);
      return { success: true };
    } catch (error) {
      console.error('Error disabling push notifications:', error);
      setIsProcessing(false);
      return { success: false, error };
    }
  }, [userId, userRole]);

  return {
    isSupported,
    permission,
    isProcessing,
    enablePushNotifications,
    disablePushNotifications
  };
};