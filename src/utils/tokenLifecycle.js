// src/utils/tokenLifecycle.js
import { supabase } from '../lib/supabaseClient';
import { getFcmToken, saveFcmToken, isPushSupported } from '../services/pushService';

/**
 * Refresh FCM token for a user on login/session refresh
 * This ensures tokens stay updated and active
 */
export async function refreshUserToken(userId) {
  if (!userId || !isPushSupported()) {
    return false;
  }

  // Only refresh if notification permission is granted
  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    console.log('🔄 Refreshing FCM token for user:', userId);
    
    // Get current FCM token
    const newToken = await getFcmToken();
    if (!newToken) {
      console.warn('⚠️ Could not retrieve FCM token');
      return false;
    }

    // Update or insert the token
    await saveFcmToken(userId, newToken);
    
    console.log('✅ FCM token refreshed successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to refresh FCM token:', error);
    return false;
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
      .from('user_fcm_tokens')
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
 * Mark user's FCM tokens as inactive (when user disables push notifications)
 */
export async function deactivateUserTokens(userId) {
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
      console.error('❌ Failed to deactivate tokens:', error);
      return false;
    }

    console.log('✅ User FCM tokens deactivated');
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
      .from('user_fcm_tokens')
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
export async function isPushNotificationEnabled(userId) {
  if (!userId) return false;

  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('push_notifications')
      .eq('user_id', userId)
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
export async function updatePushNotificationSetting(userId, enabled) {
  if (!userId) return false;

  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        push_notifications: enabled,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('❌ Failed to update push notification setting:', error);
      return false;
    }

    console.log(`✅ Push notification setting updated: ${enabled}`);
    
    // If disabled, also deactivate all tokens
    if (!enabled) {
      await deactivateUserTokens(userId);
    }

    return true;
  } catch (error) {
    console.error('❌ Error updating push notification setting:', error);
    return false;
  }
}
