// src/utils/tokenLifecycle.js
import { supabase } from '../lib/supabaseClient';
import { getFcmToken, saveFcmToken, isPushSupported } from '../services/pushService';

// Cache to prevent redundant token refreshes
const tokenRefreshCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Refresh FCM token for a user on login/session refresh
 * This ensures tokens stay updated and active
 * Includes caching to prevent redundant calls
 */
export async function refreshUserToken(userId, role = 'user') {
  if (!userId || !isPushSupported()) {
    return false;
  }

  // Only refresh if notification permission is granted
  if (Notification.permission !== 'granted') {
    return false;
  }

  // Check cache to prevent redundant calls
  const cacheKey = `refresh_${userId}_${role}`;
  const cachedResult = tokenRefreshCache.get(cacheKey);
  if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_DURATION) {
    console.log('🔄 Using cached token refresh result for user:', userId, 'role:', role);
    return cachedResult.success;
  }

  try {
    console.log('🔄 Refreshing FCM token for user:', userId, 'role:', role);
    
    // Get current FCM token
    const newToken = await getFcmToken();
    if (!newToken) {
      console.warn('⚠️ Could not retrieve FCM token');
      const result = { success: false, timestamp: Date.now() };
      tokenRefreshCache.set(cacheKey, result);
      return false;
    }

    // Update or insert the token
    await saveFcmToken(userId, newToken, role);
    
    console.log('✅ FCM token refreshed successfully');
    
    // Cache the successful result
    const result = { success: true, timestamp: Date.now() };
    tokenRefreshCache.set(cacheKey, result);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to refresh FCM token:', error);
    
    // Cache the failed result for a shorter time
    const result = { success: false, timestamp: Date.now() };
    tokenRefreshCache.set(cacheKey, result);
    
    return false;
  }
}

/**
 * Debounced version of refreshUserToken to prevent rapid successive calls
 */
const refreshDebounceMap = new Map();

export function debouncedRefreshUserToken(userId, role = 'user', delay = 1000) {
  const key = `${userId}_${role}`;
  const existingTimeout = refreshDebounceMap.get(key);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(async () => {
      refreshDebounceMap.delete(key);
      const result = await refreshUserToken(userId, role);
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
 * Clean up inactive tokens older than specified days
 * This should be called periodically or on user action
 */
export async function cleanupInactiveTokens(userId, olderThanDays = 30) {
  if (!userId) return;

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { error } = await supabase
      .from('fcm_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('is_active', false)
      .lt('updated_at', cutoffDate.toISOString());

    if (error) {
      console.error('❌ Failed to cleanup inactive tokens:', error);
    } else {
      console.log('🧹 Cleaned up inactive FCM tokens');
    }
  } catch (error) {
    console.error('❌ Error during token cleanup:', error);
  }
}

/**
 * Deactivate only the current device's token
 */
export async function deactivateCurrentDeviceToken(userId) {
  if (!userId) return false;

  try {
    // Get the current device's FCM token
    const currentToken = await getFcmToken();
    if (!currentToken) {
      console.warn('⚠️ No FCM token found for current device');
      return false;
    }

    console.log('🔇 Deactivating current device FCM token:', currentToken.substring(0, 20) + '...');

    const { error } = await supabase
      .from('fcm_tokens')
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .eq('fcm_token', currentToken);

    if (error) {
      console.error('❌ Failed to deactivate current device token:', error);
      return false;
    }

    console.log('✅ Current device FCM token deactivated');
    
    // Clear cache for this user
    clearTokenRefreshCache(userId);
    
    return true;
  } catch (error) {
    console.error('❌ Error deactivating current device token:', error);
    return false;
  }
}

/**
 * Mark user's FCM tokens as inactive (when user disables push notifications globally)
 */
export async function deactivateUserTokens(userId) {
  if (!userId) return;

  try {
    const { error } = await supabase
      .from('fcm_tokens')
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Failed to deactivate tokens:', error);
      return false;
    }

    console.log('✅ All user FCM tokens deactivated');
    
    // Clear cache for this user
    clearTokenRefreshCache(userId);
    
    return true;
  } catch (error) {
    console.error('❌ Error deactivating tokens:', error);
    return false;
  }
}

/**
 * Get active token count for a user
 */
export async function getActiveTokenCount(userId) {
  if (!userId) return 0;

  try {
    const { count, error } = await supabase
      .from('fcm_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Failed to get token count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('❌ Error getting token count:', error);
    return 0;
  }
}

/**
 * Check if user has push notifications enabled in settings
 */
export async function isPushNotificationEnabled(userId, role = 'user') {
  if (!userId) return false;

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('push_notifications')
      .eq('user_id', userId)
      .eq('role', role)
      .single();

    if (error) {
      console.warn('⚠️ Could not fetch push notification setting, defaulting to false:', error);
      return false;
    }

    return !!data?.push_notifications;
  } catch (error) {
    console.error('❌ Error checking push notification setting:', error);
    return false;
  }
}

/**
 * Update user's push notification preference
 */
export async function updatePushNotificationSetting(userId, enabled, role = 'user') {
  if (!userId) return false;

  try {
    // First try to update existing record
    const { data: existingData, error: selectError } = await supabase
      .from('settings')
      .select('id')
      .eq('user_id', userId)
      .eq('role', role)
      .single();

    let result;
    if (existingData) {
      // Update existing record
      result = await supabase
        .from('settings')
        .update({
          push_notifications: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('role', role);
    } else {
      // Insert new record
      result = await supabase
        .from('settings')
        .insert({
          user_id: userId,
          role: role,
          push_notifications: enabled,
          updated_at: new Date().toISOString()
        });
    }

    if (result.error) {
      console.error('❌ Failed to update push notification setting:', result.error);
      return false;
    }

    console.log(`✅ Push notification setting updated: ${enabled}`);
    
    // If disabled, deactivate ALL user tokens (global disable)
    if (!enabled) {
      await deactivateUserTokens(userId);
    }

    return true;
  } catch (error) {
    console.error('❌ Error updating push notification setting:', error);
    return false;
  }
}
