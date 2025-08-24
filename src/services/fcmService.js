// src/services/fcmService.js
import { supabase } from "../lib/supabaseClient";

/**
 * Send FCM notification to a specific user
 * @param {string} userId - The user ID to send notification to
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} options - Additional options
 * @param {Object} options.data - Custom data to include with notification
 * @param {string} options.image - Optional image URL
 * @param {string} options.clickAction - Optional URL to navigate to when clicked
 * @returns {Promise<Object>} Result object with success status and details
 */
export async function sendPushNotification(userId, title, body, options = {}) {
  try {
    const { data, image, clickAction } = options;

    console.log(`📨 Sending FCM notification to user: ${userId}`);

    // Call the Supabase Edge Function
    const { data: result, error } = await supabase.functions.invoke('send-fcm-notification', {
      body: {
        user_id: userId,
        title,
        body,
        data,
        image,
        click_action: clickAction,
      },
    });

    if (error) {
      console.error('❌ FCM Edge Function error:', error);
      throw new Error(`FCM function failed: ${error.message}`);
    }

    console.log('✅ FCM notification result:', result);
    return result;

  } catch (error) {
    console.error('❌ Failed to send FCM notification:', error);
    throw error;
  }
}

/**
 * Send FCM notification to multiple users
 * @param {string[]} userIds - Array of user IDs to send notification to
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} options - Additional options
 * @returns {Promise<Object[]>} Array of result objects
 */
export async function sendPushNotificationToMultipleUsers(userIds, title, body, options = {}) {
  console.log(`📨 Sending FCM notifications to ${userIds.length} users`);

  // Send notifications concurrently but limit concurrency to avoid overwhelming the system
  const batchSize = 10;
  const results = [];

  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    const batchPromises = batch.map(userId => 
      sendPushNotification(userId, title, body, options)
        .catch(error => ({
          user_id: userId,
          success: false,
          error: error.message
        }))
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`📊 Bulk FCM notification complete: ${successful} successful, ${failed} failed`);

  return {
    total: userIds.length,
    successful,
    failed,
    results
  };
}

/**
 * Send rental-related notifications
 */
export const NotificationTemplates = {
  /**
   * Send rental confirmation notification
   */
  async rentalConfirmed(userId, rentalDetails) {
    return sendPushNotification(
      userId,
      "🎉 Rental Confirmed!",
      `Your rental for ${rentalDetails.camera_name} has been confirmed. Pickup on ${rentalDetails.pickup_date}.`,
      {
        data: {
          type: "rental_confirmed",
          rental_id: rentalDetails.id,
          camera_name: rentalDetails.camera_name
        },
        clickAction: `/user/rentals?rental=${rentalDetails.id}`
      }
    );
  },

  /**
   * Send pickup reminder notification
   */
  async pickupReminder(userId, rentalDetails) {
    return sendPushNotification(
      userId,
      "📅 Pickup Reminder",
      `Don't forget to pick up your ${rentalDetails.camera_name} today!`,
      {
        data: {
          type: "pickup_reminder",
          rental_id: rentalDetails.id,
          camera_name: rentalDetails.camera_name
        },
        clickAction: `/user/rentals?rental=${rentalDetails.id}`
      }
    );
  },

  /**
   * Send return reminder notification
   */
  async returnReminder(userId, rentalDetails) {
    return sendPushNotification(
      userId,
      "⏰ Return Reminder",
      `Please return your ${rentalDetails.camera_name} by ${rentalDetails.return_date}.`,
      {
        data: {
          type: "return_reminder",
          rental_id: rentalDetails.id,
          camera_name: rentalDetails.camera_name
        },
        clickAction: `/user/rentals?rental=${rentalDetails.id}`
      }
    );
  },

  /**
   * Send item returned notification
   */
  async itemReturned(userId, rentalDetails) {
    return sendPushNotification(
      userId,
      "✅ Item Returned",
      `Thank you for returning the ${rentalDetails.camera_name}. Your rental is now complete.`,
      {
        data: {
          type: "item_returned",
          rental_id: rentalDetails.id,
          camera_name: rentalDetails.camera_name
        },
        clickAction: `/user/rentals?rental=${rentalDetails.id}`
      }
    );
  },

  /**
   * Send verification status update
   */
  async verificationUpdate(userId, status, message) {
    const statusEmojis = {
      verified: "✅",
      rejected: "❌",
      pending: "⏳"
    };

    return sendPushNotification(
      userId,
      `${statusEmojis[status]} Verification ${status === 'verified' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Under Review'}`,
      message,
      {
        data: {
          type: "verification_update",
          status
        },
        clickAction: "/user/profile"
      }
    );
  },

  /**
   * Send general notification
   */
  async general(userId, title, body, data = {}) {
    return sendPushNotification(userId, title, body, { data });
  }
};

/**
 * Check if user has push notifications enabled
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} Whether push notifications are enabled
 */
export async function isPushNotificationEnabled(userId) {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('push_notifications')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking push notification settings:', error);
      return false;
    }

    return data?.push_notifications === true;
  } catch (error) {
    console.error('Failed to check push notification settings:', error);
    return false;
  }
}

/**
 * Get user's active FCM token count
 * @param {string} userId - User ID to check
 * @returns {Promise<number>} Number of active tokens
 */
export async function getActiveTokenCount(userId) {
  try {
    const { count, error } = await supabase
      .from('user_fcm_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Error getting token count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Failed to get token count:', error);
    return 0;
  }
}
