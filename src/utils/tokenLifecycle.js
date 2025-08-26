// src/utils/tokenLifecycle.js
import { supabase } from '../lib/supabaseClient';
import { getFcmToken, saveUserFcmToken, saveAdminFcmToken, isPushSupported } from '../services/pushService';

// Cache to prevent redundant token refreshes
const tokenRefreshCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Refresh FCM token for a user in user_fcm_tokens table
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export async function refreshUserToken(userId) {
  if (!userId || !isPushSupported()) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const cacheKey = `refresh_${userId}_user`;
  const cachedResult = tokenRefreshCache.get(cacheKey);
  if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_DURATION) {
    console.log('Using cached token refresh result for user:', userId);
    return cachedResult.success;
  }

  try {
    const newToken = await getFcmToken();
    if (!newToken) {
      console.warn('Could not retrieve FCM token');
      const result = { success: false, timestamp: Date.now() };
      tokenRefreshCache.set(cacheKey, result);
      return false;
    }

    await saveUserFcmToken(userId, newToken);
    
    const result = { success: true, timestamp: Date.now() };
    tokenRefreshCache.set(cacheKey, result);
    
    return true;
  } catch (error) {
    console.error('Failed to refresh user FCM token:', error);
    
    const result = { success: false, timestamp: Date.now() };
    tokenRefreshCache.set(cacheKey, result);
    
    return false;
  }
}

/**
 * Refresh FCM token for an admin in admin_fcm_tokens table
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export async function refreshAdminToken(userId) {
  if (!userId || !isPushSupported()) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const cacheKey = `refresh_${userId}_admin`;
  const cachedResult = tokenRefreshCache.get(cacheKey);
  if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_DURATION) {
    console.log('Using cached token refresh result for admin:', userId);
    return cachedResult.success;
  }

  try {
    const newToken = await getFcmToken();
    if (!newToken) {
      console.warn('Could not retrieve FCM token');
      const result = { success: false, timestamp: Date.now() };
      tokenRefreshCache.set(cacheKey, result);
      return false;
    }

    await saveAdminFcmToken(userId, newToken);
    
    const result = { success: true, timestamp: Date.now() };
    tokenRefreshCache.set(cacheKey, result);
    
    return true;
  } catch (error) {
    console.error('Failed to refresh admin FCM token:', error);
    
    const result = { success: false, timestamp: Date.now() };
    tokenRefreshCache.set(cacheKey, result);
    
    return false;
  }
}

/**
 * Context-aware token refresh based on user role
 * @param {string} userId - User ID
 * @param {string} userRole - User role ('user' or 'admin')
 * @returns {Promise<boolean>} Success status
 */
export async function refreshTokenForCurrentContext(userId, userRole) {
  if (userRole === 'admin') {
    return await refreshAdminToken(userId);
  } else {
    return await refreshUserToken(userId);
  }
}

/**
 * Debounced version of refreshTokenForCurrentContext to prevent rapid successive calls
 */
const refreshDebounceMap = new Map();

export function debouncedRefreshUserToken(userId, userRole = 'user', delay = 1000) {
  const key = `${userId}_${userRole}`;
  const existingTimeout = refreshDebounceMap.get(key);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(async () => {
      refreshDebounceMap.delete(key);
      const result = await refreshTokenForCurrentContext(userId, userRole);
      resolve(result);
    }, delay);
    
    refreshDebounceMap.set(key, timeout);
  });
}

/**
 * Clear token refresh cache (useful for force refresh)
 */
export function clearTokenRefreshCache(userId = null) {
  if (userId) {
    tokenRefreshCache.delete(`refresh_${userId}`);
  } else {
    tokenRefreshCache.clear();
  }
}

/**
 * Clean up inactive tokens older than specified days from user_fcm_tokens
 * @param {string} userId - User ID
 * @param {number} olderThanDays - Days threshold
 */
export async function cleanupInactiveUserTokens(userId, olderThanDays = 30) {
  if (!userId) return;

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { error } = await supabase
      .from('user_fcm_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('is_active', false)
      .lt('updated_at', cutoffDate.toISOString());

    if (error) {
      console.error('Failed to cleanup inactive user tokens:', error);
    } else {
      console.log('Cleaned up inactive user FCM tokens');
    }
  } catch (error) {
    console.error('Error during user token cleanup:', error);
  }
}

/**
 * Clean up inactive tokens older than specified days from admin_fcm_tokens
 * @param {string} userId - User ID
 * @param {number} olderThanDays - Days threshold
 */
export async function cleanupInactiveAdminTokens(userId, olderThanDays = 30) {
  if (!userId) return;

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { error } = await supabase
      .from('admin_fcm_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('is_active', false)
      .lt('updated_at', cutoffDate.toISOString());

    if (error) {
      console.error('Failed to cleanup inactive admin tokens:', error);
    } else {
      console.log('Cleaned up inactive admin FCM tokens');
    }
  } catch (error) {
    console.error('Error during admin token cleanup:', error);
  }
}

/**
 * Deactivate only the current device's token from user_fcm_tokens
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export async function deactivateCurrentUserDeviceToken(userId) {
  if (!userId) return false;

  try {
    const currentToken = await getFcmToken();
    if (!currentToken) {
      console.warn('No FCM token found for current device');
      return false;
    }

    const { error } = await supabase
      .from('user_fcm_tokens')
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .eq('fcm_token', currentToken);

    if (error) {
      console.error('Failed to deactivate current user device token:', error);
      return false;
    }

    clearTokenRefreshCache(userId);
    return true;
  } catch (error) {
    console.error('Error deactivating current user device token:', error);
    return false;
  }
}

/**
 * Deactivate only the current device's token from admin_fcm_tokens
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export async function deactivateCurrentAdminDeviceToken(userId) {
  if (!userId) return false;

  try {
    const currentToken = await getFcmToken();
    if (!currentToken) {
      console.warn('No FCM token found for current device');
      return false;
    }

    const { error } = await supabase
      .from('admin_fcm_tokens')
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .eq('fcm_token', currentToken);

    if (error) {
      console.error('Failed to deactivate current admin device token:', error);
      return false;
    }

    clearTokenRefreshCache(userId);
    return true;
  } catch (error) {
    console.error('Error deactivating current admin device token:', error);
    return false;
  }
}

/**
 * Mark user's FCM tokens as inactive in user_fcm_tokens (when user disables push notifications globally)
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export async function deactivateAllUserTokens(userId) {
  if (!userId) return;

  try {
    const { error } = await supabase
      .from('user_fcm_tokens')
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to deactivate user tokens:', error);
      return false;
    }

    clearTokenRefreshCache(userId);
    return true;
  } catch (error) {
    console.error('Error deactivating user tokens:', error);
    return false;
  }
}

/**
 * Mark admin's FCM tokens as inactive in admin_fcm_tokens (when admin disables push notifications globally)
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export async function deactivateAllAdminTokens(userId) {
  if (!userId) return;

  try {
    const { error } = await supabase
      .from('admin_fcm_tokens')
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to deactivate admin tokens:', error);
      return false;
    }

    clearTokenRefreshCache(userId);
    return true;
  } catch (error) {
    console.error('Error deactivating admin tokens:', error);
    return false;
  }
}

/**
 * Get active token count for a user from user_fcm_tokens
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of active tokens
 */
export async function getUserActiveTokenCount(userId) {
  if (!userId) return 0;

  try {
    const { count, error } = await supabase
      .from('user_fcm_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Failed to get user token count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting user token count:', error);
    return 0;
  }
}

/**
 * Get active token count for an admin from admin_fcm_tokens
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of active tokens
 */
export async function getAdminActiveTokenCount(userId) {
  if (!userId) return 0;

  try {
    const { count, error } = await supabase
      .from('admin_fcm_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Failed to get admin token count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting admin token count:', error);
    return 0;
  }
}

/**
 * Check if user has push notifications enabled in user_settings
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Whether push notifications are enabled
 */
export async function isUserPushNotificationEnabled(userId) {
  if (!userId) return false;

  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('push_notifications')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.warn('Could not fetch user push notification setting, defaulting to false:', error);
      return false;
    }

    return !!data?.push_notifications;
  } catch (error) {
    console.error('Error checking user push notification setting:', error);
    return false;
  }
}

/**
 * Check if admin has push notifications enabled in admin_settings
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Whether push notifications are enabled
 */
export async function isAdminPushNotificationEnabled(userId) {
  if (!userId) return false;

  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('push_notifications')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.warn('Could not fetch admin push notification setting, defaulting to false:', error);
      return false;
    }

    return !!data?.push_notifications;
  } catch (error) {
    console.error('Error checking admin push notification setting:', error);
    return false;
  }
}

/**
 * Update user's push notification preference in user_settings
 * @param {string} userId - User ID
 * @param {boolean} enabled - Whether to enable push notifications
 * @returns {Promise<boolean>} Success status
 */
export async function updateUserPushNotificationSetting(userId, enabled) {
  if (!userId) return false;

  try {
    const { data: existingData, error: selectError } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;
    if (existingData) {
      result = await supabase
        .from('user_settings')
        .update({
          push_notifications: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    } else {
      result = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          push_notifications: enabled,
          updated_at: new Date().toISOString()
        });
    }

    if (result.error) {
      console.error('Failed to update user push notification setting:', result.error);
      return false;
    }

    if (!enabled) {
      await deactivateAllUserTokens(userId);
    }

    return true;
  } catch (error) {
    console.error('Error updating user push notification setting:', error);
    return false;
  }
}

/**
 * Update admin's push notification preference in admin_settings
 * @param {string} userId - User ID
 * @param {boolean} enabled - Whether to enable push notifications
 * @returns {Promise<boolean>} Success status
 */
export async function updateAdminPushNotificationSetting(userId, enabled) {
  if (!userId) return false;

  try {
    const { data: existingData, error: selectError } = await supabase
      .from('admin_settings')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;
    if (existingData) {
      result = await supabase
        .from('admin_settings')
        .update({
          push_notifications: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    } else {
      result = await supabase
        .from('admin_settings')
        .insert({
          user_id: userId,
          push_notifications: enabled,
          updated_at: new Date().toISOString()
        });
    }

    if (result.error) {
      console.error('Failed to update admin push notification setting:', result.error);
      return false;
    }

    if (!enabled) {
      await deactivateAllAdminTokens(userId);
    }

    return true;
  } catch (error) {
    console.error('Error updating admin push notification setting:', error);
    return false;
  }
}

// Backward compatibility functions
/**
 * Backward compatibility function for isPushNotificationEnabled
 * @param {string} userId - User ID
 * @param {string} userRole - User role ('user' or 'admin')
 * @returns {Promise<boolean>} Whether push notifications are enabled
 */
export async function isPushNotificationEnabled(userId, userRole = 'user') {
  if (userRole === 'admin') {
    return await isAdminPushNotificationEnabled(userId);
  } else {
    return await isUserPushNotificationEnabled(userId);
  }
}

/**
 * Backward compatibility function for updatePushNotificationSetting
 * @param {string} userId - User ID
 * @param {boolean} enabled - Whether to enable push notifications
 * @param {string} userRole - User role ('user' or 'admin')
 * @returns {Promise<boolean>} Success status
 */
export async function updatePushNotificationSetting(userId, enabled, userRole = 'user') {
  if (userRole === 'admin') {
    return await updateAdminPushNotificationSetting(userId, enabled);
  } else {
    return await updateUserPushNotificationSetting(userId, enabled);
  }
}
