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
 * Save or update FCM token in Supabase with role awareness
 * Includes proper platform detection and device info with timestamp
 */
export async function saveFcmToken(userId, token, role = 'user') {
  if (!userId || !token) return;

  // Check cache to prevent redundant saves
  const cacheKey = `${userId}_${token}_${role}`;
  const cachedSave = tokenSaveCache.get(cacheKey);
  if (
    cachedSave &&
    Date.now() - cachedSave.timestamp < TOKEN_SAVE_CACHE_DURATION
  ) {
    console.log("💾 Using cached FCM token save result");
    return cachedSave.data;
  }

  try {
    console.log("💾 Saving FCM token for user:", userId, "role:", role);

    const platform = detectPlatform();
    const deviceName = getDeviceName(navigator.userAgent, platform);
    console.log("📱 Detected platform:", platform, "Device:", deviceName);

    // DON'T deactivate other tokens - just upsert this specific token
    const { data, error } = await supabase
      .from("fcm_tokens")
      .upsert(
        {
          user_id: userId,
          fcm_token: token,
          role: role,
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
      console.error("❌ Error saving FCM token:", error);
      throw error;
    }

    console.log("✅ FCM token saved successfully");

    // Cache the result
    tokenSaveCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return data;
  } catch (error) {
    console.error("❌ Error saving FCM token:", error);
    throw error;
  }
}

/**
 * Get all FCM tokens for a user with device info and last activity
 */
export async function getUserDevices(userId, role = 'user') {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from("fcm_tokens")
      .select("*")
      .eq("user_id", userId)
      .eq("role", role)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("❌ Error fetching user devices:", error);
      return [];
    }

    // Get current device token to mark it
    const currentToken = await getFcmToken();
    
    return data.map(device => ({
      ...device,
      is_current_device: device.fcm_token === currentToken,
      device_name: device.device_info?.deviceName || 'Unknown Device',
      last_active: device.device_info?.timestamp || device.updated_at,
      relative_time: getRelativeTime(device.device_info?.timestamp || device.updated_at)
    }));
  } catch (error) {
    console.error("❌ Error fetching user devices:", error);
    return [];
  }
}

/**
 * Toggle device-specific push notifications
 */
export async function toggleDeviceNotifications(userId, fcmToken, enabled, role = 'user') {
  if (!userId || !fcmToken) return false;

  try {
    const { error } = await supabase
      .from("fcm_tokens")
      .update({ 
        is_active: enabled,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .eq("fcm_token", fcmToken)
      .eq("role", role);

    if (error) {
      console.error("❌ Error toggling device notifications:", error);
      return false;
    }

    console.log(`✅ Device notifications ${enabled ? 'enabled' : 'disabled'} for token`);
    return true;
  } catch (error) {
    console.error("❌ Error toggling device notifications:", error);
    return false;
  }
}

/**
 * Update last activity timestamp for current device
 */
export async function updateDeviceActivity(userId, role = 'user') {
  if (!userId) return;

  try {
    const currentToken = await getFcmToken();
    if (!currentToken) return;

    await supabase
      .from("fcm_tokens")
      .update({
        device_info: {
          userAgent: navigator.userAgent,
          deviceName: getDeviceName(navigator.userAgent, detectPlatform()),
          timestamp: new Date().toISOString(),
        },
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .eq("fcm_token", currentToken)
      .eq("role", role);

    console.log("📱 Updated device activity timestamp");
  } catch (error) {
    console.error("❌ Error updating device activity:", error);
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

// Add a function to deactivate only the current device's token
export async function deactivateFcmToken(userId, token, role = 'user') {
  if (!userId || !token) return;

  try {
    console.log("🔇 Deactivating FCM token for user:", userId, "role:", role);

    const { error } = await supabase
      .from("fcm_tokens")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("fcm_token", token)
      .eq("role", role);

    if (error) {
      console.error("❌ Error deactivating FCM token:", error);
      throw error;
    }

    console.log("✅ FCM token deactivated successfully");
  } catch (error) {
    console.error("❌ Error deactivating FCM token:", error);
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
 * Full flow: Check support, request permission, get token, send to Supabase
 */
export async function registerPushForUser(userId, role = 'user') {
  if (!isPushSupported()) {
    console.warn("⚠️ Push notifications not supported in this browser");
    return false;
  }

  const granted = await requestNotificationPermission();
  if (!granted) {
    // Handle gracefully in UI (e.g., show instructions to enable)
    return false;
  }

  const token = await getFcmToken();
  if (!token) return false;

  await saveFcmToken(userId, token, role);
  return true;
}
