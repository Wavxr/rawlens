// src/services/pushService.js
import { supabase } from "../lib/supabaseClient";
import { messaging } from "../lib/firebaseClient";
import { getToken } from "firebase/messaging";

/**
 * Check if push notifications are supported in this browser
 */
export function isPushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Request notification permission from the user
 * Only requests if Notification.permission === 'default'
 * Returns true if granted, false otherwise
 */
export async function requestNotificationPermission() {
  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      return true;
    } else {
      console.log("🔕 Notification permission denied by user");
      return false;
    }
  }

  return Notification.permission === "granted";
}

/**
 * Retrieve the FCM token for this device/browser
 * Uses the public VAPID key stored in .env
 */
export async function getFcmToken() {
  try {
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_PUBLIC_KEY,
    });
    return token;
  } catch (err) {
    console.error("❌ Error retrieving FCM token:", err);
    return null;
  }
}

// Add caching to prevent redundant FCM token saves

/**
 * Detect the platform based on user agent and environment
 */
function detectPlatform() {
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Check if it's a mobile device
  if (/android/i.test(userAgent)) {
    return 'android';
  }
  
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return 'ios';
  }
  
  // Check if it's in a mobile browser (additional mobile indicators)
  if (/mobile|tablet/i.test(userAgent)) {
    return 'mobile_web';
  }
  
  // Default to web for desktop browsers
  return 'web';
}

/**
 * Generate a human-readable device name from user agent
 */
function getDeviceName(userAgent, platform) {
  const ua = userAgent.toLowerCase();
  
  // Browser detection
  let browser = 'Unknown Browser';
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('edg')) browser = 'Edge';
  
  // OS detection
  let os = 'Unknown OS';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac os')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone')) os = 'iPhone';
  else if (ua.includes('ipad')) os = 'iPad';
  
  // Device-specific names
  if (platform === 'android') {
    if (ua.includes('sm-')) {
      const match = ua.match(/sm-([a-z0-9]+)/);
      return `${match ? match[1].toUpperCase() : 'Android'} Device`;
    }
    return 'Android Device';
  }
  
  if (platform === 'ios') {
    if (ua.includes('iphone')) return 'iPhone';
    if (ua.includes('ipad')) return 'iPad';
    return 'iOS Device';
  }
  
  return `${browser} on ${os}`;
}

const tokenSaveCache = new Map();
const TOKEN_SAVE_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

/**
 * Save or update FCM token in user_fcm_tokens table
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 * @returns {Promise<Object>} Saved token data
 */
export async function saveUserFcmToken(userId, token) {
  if (!userId || !token) return;

  const cacheKey = `${userId}_${token}_user`;
  const cachedSave = tokenSaveCache.get(cacheKey);
  if (
    cachedSave &&
    Date.now() - cachedSave.timestamp < TOKEN_SAVE_CACHE_DURATION
  ) {
    console.log("Using cached FCM token save result");
    return cachedSave.data;
  }

  try {
    const platform = detectPlatform();
    const deviceName = getDeviceName(navigator.userAgent, platform);

    const { data, error } = await supabase
      .from("user_fcm_tokens")
      .upsert(
        {
          user_id: userId,
          fcm_token: token,
          platform: platform,
          is_active: true,
          device_info: {
            userAgent: navigator.userAgent,
            deviceName: deviceName,
            timestamp: new Date().toISOString(),
          },
        },
        {
          onConflict: "user_id,fcm_token",
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error saving user FCM token:", error);
      throw error;
    }

    tokenSaveCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return data;
  } catch (error) {
    console.error("Error saving user FCM token:", error);
    throw error;
  }
}

/**
 * Save or update FCM token in admin_fcm_tokens table
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 * @returns {Promise<Object>} Saved token data
 */
export async function saveAdminFcmToken(userId, token) {
  if (!userId || !token) return;

  const cacheKey = `${userId}_${token}_admin`;
  const cachedSave = tokenSaveCache.get(cacheKey);
  if (
    cachedSave &&
    Date.now() - cachedSave.timestamp < TOKEN_SAVE_CACHE_DURATION
  ) {
    console.log("Using cached FCM token save result");
    return cachedSave.data;
  }

  try {
    const platform = detectPlatform();
    const deviceName = getDeviceName(navigator.userAgent, platform);

    const { data, error } = await supabase
      .from("admin_fcm_tokens")
      .upsert(
        {
          user_id: userId,
          fcm_token: token,
          platform: platform,
          is_active: true,
          device_info: {
            userAgent: navigator.userAgent,
            deviceName: deviceName,
            timestamp: new Date().toISOString(),
          },
        },
        {
          onConflict: "user_id,fcm_token",
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error saving admin FCM token:", error);
      throw error;
    }

    tokenSaveCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return data;
  } catch (error) {
    console.error("Error saving admin FCM token:", error);
    throw error;
  }
}

/**
 * Get all FCM tokens for a user from user_fcm_tokens table
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of user devices
 */
export const getUserDevices = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_fcm_tokens')
      .select(`
        id,
        user_id,
        fcm_token,
        platform,
        device_info,
        is_active,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error("Error fetching user devices:", error);
      throw error;
    }

    const currentToken = await getCurrentDeviceFcmToken();

    const processedDevices = data.map(device => {
      const deviceInfo = device.device_info || {};
      const deviceName = deviceInfo.deviceName || 
                        deviceInfo.userAgent?.split(' ')[0] || 
                        `${device.platform} Device`;
      
      const lastActive = new Date(device.updated_at);
      const now = new Date();
      const diffInHours = Math.abs(now - lastActive) / (1000 * 60 * 60);
      
      let relativeTime;
      if (diffInHours < 1) {
        relativeTime = 'just now';
      } else if (diffInHours < 24) {
        relativeTime = `${Math.floor(diffInHours)} hours ago`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        relativeTime = `${diffInDays} days ago`;
      }

      return {
        ...device,
        device_name: deviceName,
        relative_time: relativeTime,
        is_current_device: device.fcm_token === currentToken,
      };
    });

    return processedDevices;

  } catch (error) {
    console.error("Failed to get user devices:", error);
    return [];
  }
};

/**
 * Get all FCM tokens for an admin from admin_fcm_tokens table
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of admin devices
 */
export const getAdminDevices = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('admin_fcm_tokens')
      .select(`
        id,
        user_id,
        fcm_token,
        platform,
        device_info,
        is_active,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error("Error fetching admin devices:", error);
      throw error;
    }

    const currentToken = await getCurrentDeviceFcmToken();

    const processedDevices = data.map(device => {
      const deviceInfo = device.device_info || {};
      const deviceName = deviceInfo.deviceName || 
                        deviceInfo.userAgent?.split(' ')[0] || 
                        `${device.platform} Device`;
      
      const lastActive = new Date(device.updated_at);
      const now = new Date();
      const diffInHours = Math.abs(now - lastActive) / (1000 * 60 * 60);
      
      let relativeTime;
      if (diffInHours < 1) {
        relativeTime = 'just now';
      } else if (diffInHours < 24) {
        relativeTime = `${Math.floor(diffInHours)} hours ago`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        relativeTime = `${diffInDays} days ago`;
      }

      return {
        ...device,
        device_name: deviceName,
        relative_time: relativeTime,
        is_current_device: device.fcm_token === currentToken,
      };
    });

    return processedDevices;

  } catch (error) {
    console.error("Failed to get admin devices:", error);
    return [];
  }
};

/**
 * Toggle device-specific push notifications for user context
 * @param {string} userId - User ID
 * @param {string} fcmToken - FCM token
 * @param {boolean} enabled - Enable or disable notifications
 * @returns {Promise<boolean>} Success status
 */
export async function toggleUserDeviceNotifications(userId, fcmToken, enabled) {
  if (!userId || !fcmToken) return false;

  try {
    const { error } = await supabase
      .from("user_fcm_tokens")
      .update({ 
        is_active: enabled,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .eq("fcm_token", fcmToken);

    if (error) {
      console.error("Error toggling user device notifications:", error);
      return false;
    }

    console.log(`User device notifications ${enabled ? 'enabled' : 'disabled'} for token`);
    return true;
  } catch (error) {
    console.error("Error toggling user device notifications:", error);
    return false;
  }
}

/**
 * Toggle device-specific push notifications for admin context
 * @param {string} userId - User ID
 * @param {string} fcmToken - FCM token
 * @param {boolean} enabled - Enable or disable notifications
 * @returns {Promise<boolean>} Success status
 */
export async function toggleAdminDeviceNotifications(userId, fcmToken, enabled) {
  if (!userId || !fcmToken) return false;

  try {
    const { error } = await supabase
      .from("admin_fcm_tokens")
      .update({ 
        is_active: enabled,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .eq("fcm_token", fcmToken);

    if (error) {
      console.error("Error toggling admin device notifications:", error);
      return false;
    }

    console.log(`Admin device notifications ${enabled ? 'enabled' : 'disabled'} for token`);
    return true;
  } catch (error) {
    console.error("Error toggling admin device notifications:", error);
    return false;
  }
}

/**
 * Update last activity timestamp for current device in user context
 * @param {string} userId - User ID
 */
export async function updateUserDeviceActivity(userId) {
  if (!userId) return;

  try {
    const currentToken = await getFcmToken();
    if (!currentToken) return;

    await supabase
      .from("user_fcm_tokens")
      .update({
        device_info: {
          userAgent: navigator.userAgent,
          deviceName: getDeviceName(navigator.userAgent, detectPlatform()),
          timestamp: new Date().toISOString(),
        },
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .eq("fcm_token", currentToken);

    console.log("Updated user device activity timestamp");
  } catch (error) {
    console.error("Error updating user device activity:", error);
  }
}

/**
 * Update last activity timestamp for current device in admin context
 * @param {string} userId - User ID
 */
export async function updateAdminDeviceActivity(userId) {
  if (!userId) return;

  try {
    const currentToken = await getFcmToken();
    if (!currentToken) return;

    await supabase
      .from("admin_fcm_tokens")
      .update({
        device_info: {
          userAgent: navigator.userAgent,
          deviceName: getDeviceName(navigator.userAgent, detectPlatform()),
          timestamp: new Date().toISOString(),
        },
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .eq("fcm_token", currentToken);

    console.log("Updated admin device activity timestamp");
  } catch (error) {
    console.error("Error updating admin device activity:", error);
  }
}

/**
 * Get relative time string (e.g., "2 hours ago", "Yesterday")
 */
function getRelativeTime(timestamp) {
  if (!timestamp) return 'Unknown';
  
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

/**
 * Deactivate FCM token in user_fcm_tokens table
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 */
export async function deactivateUserFcmToken(userId, token) {
  if (!userId || !token) return;

  try {
    const { error } = await supabase
      .from("user_fcm_tokens")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("fcm_token", token);

    if (error) {
      console.error("Error deactivating user FCM token:", error);
      throw error;
    }

    console.log("User FCM token deactivated successfully");
  } catch (error) {
    console.error("Error deactivating user FCM token:", error);
    throw error;
  }
}

/**
 * Deactivate FCM token in admin_fcm_tokens table
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 */
export async function deactivateAdminFcmToken(userId, token) {
  if (!userId || !token) return;

  try {
    const { error } = await supabase
      .from("admin_fcm_tokens")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("fcm_token", token);

    if (error) {
      console.error("Error deactivating admin FCM token:", error);
      throw error;
    }

    console.log("Admin FCM token deactivated successfully");
  } catch (error) {
    console.error("Error deactivating admin FCM token:", error);
    throw error;
  }
}

/**
 * Get the current device's FCM token
 * This is used to identify which token belongs to the current device
 */
export async function getCurrentDeviceFcmToken() {
  try {
    const token = await getFcmToken();
    return token;
  } catch (error) {
    console.error("❌ Error getting current device FCM token:", error);
    return null;
  }
}

/**
 * Full flow for user: Check support, request permission, get token, send to user_fcm_tokens
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export async function registerUserPushNotifications(userId) {
  if (!isPushSupported()) {
    console.warn("Push notifications not supported in this browser");
    return false;
  }

  const granted = await requestNotificationPermission();
  if (!granted) {
    return false;
  }

  const token = await getFcmToken();
  if (!token) return false;

  await saveUserFcmToken(userId, token);
  return true;
}

/**
 * Full flow for admin: Check support, request permission, get token, send to admin_fcm_tokens
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export async function registerAdminPushNotifications(userId) {
  if (!isPushSupported()) {
    console.warn("Push notifications not supported in this browser");
    return false;
  }

  const granted = await requestNotificationPermission();
  if (!granted) {
    return false;
  }

  const token = await getFcmToken();
  if (!token) return false;

  await saveAdminFcmToken(userId, token);
  return true;
}

/**
 * Context-aware token saving based on current user role
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 * @param {string} userRole - User role ('user' or 'admin')
 * @returns {Promise<Object>} Saved token data
 */
export async function saveFcmTokenForCurrentContext(userId, token, userRole) {
  const platform = detectPlatform();
  const deviceInfo = {
    userAgent: navigator.userAgent,
    deviceName: getDeviceName(navigator.userAgent, platform),
    timestamp: new Date().toISOString(),
  };
  
  if (userRole === 'admin') {
    return await saveAdminFcmToken(userId, token, platform, deviceInfo);
  } else {
    return await saveUserFcmToken(userId, token, platform, deviceInfo);
  }
}

/**
 * Backward compatibility function for updateDeviceActivity
 * Context-aware device activity update based on user role
 * @param {string} userId - User ID
 * @param {string} userRole - User role ('user' or 'admin')
 */
export async function updateDeviceActivity(userId, userRole = 'user') {
  if (userRole === 'admin') {
    await updateAdminDeviceActivity(userId);
  } else {
    await updateUserDeviceActivity(userId);
  }
}
