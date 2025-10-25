import { supabase } from "../lib/supabaseClient";
import { messaging } from "../lib/firebaseClient";
import { getToken } from "firebase/messaging";
import { generateDeviceId, getBrowserType, getDeviceName } from "../utils/deviceFingerprint";

const tokenSaveCache = new Map();
const TOKEN_SAVE_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

//Check if push notifications are supported in this browser
export function isPushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// Request notification permission from the user
export async function requestNotificationPermission() {
  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission === "granted") return true;
    else {
      console.log("Notification permission denied by user");
      return false;
    }
  }

  return Notification.permission === "granted";
}

// Retrieve the FCM token for this device/browser
export async function getFcmToken() {
  try {
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_PUBLIC_KEY,
    });
    return token;
  } catch (err) {
    console.error("Error retrieving FCM token:", err);
    return null;
  }
}

// Detect the platform based on user agent and environment
function detectPlatform() {
  const userAgent = navigator.userAgent.toLowerCase();

  if (/android/i.test(userAgent)) return 'android'; 
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios'; 
  if (/mobile|tablet/i.test(userAgent)) return 'mobile_web';
  
  return 'web';
}

// Generate a human-readable device name from user agent (legacy function)
function getLegacyDeviceName(userAgent, platform) {
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

// Save or update FCM token in user_fcm_tokens table with device deduplication
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
    const deviceId = generateDeviceId();
    const browserType = getBrowserType();
    const deviceName = getDeviceName();
    const platform = detectPlatform();

    // Check if device already exists
    const { data: existingDevice } = await supabase
      .from("user_fcm_tokens")
      .select("*")
      .eq("user_id", userId)
      .eq("device_id", deviceId)
      .single();

    let data, error;

    if (existingDevice) {
      // Update existing device with new token
      const result = await supabase
        .from("user_fcm_tokens")
        .update({
          fcm_token: token,
          last_seen: new Date().toISOString(),
          mapped: true,
          enabled: true,
          device_info: {
            ...existingDevice.device_info,
            deviceName,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingDevice.id)
        .select()
        .single();

      data = result.data;
      error = result.error;
      console.log(`Updated user device token: ${deviceName}`);
    } else {
      // Create new device entry
      const result = await supabase
        .from("user_fcm_tokens")
        .insert({
          user_id: userId,
          fcm_token: token,
          platform: platform,
          device_id: deviceId,
          browser_type: browserType,
          last_seen: new Date().toISOString(),
          mapped: true,
          enabled: true,
          device_info: {
            userAgent: navigator.userAgent,
            deviceName,
            timestamp: new Date().toISOString(),
          },
        })
        .select()
        .single();

      data = result.data;
      error = result.error;
      console.log(`Created new user device: ${deviceName}`);
    }

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

// Save or update FCM token in admin_fcm_tokens table
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
    const deviceId = generateDeviceId();
    const browserType = getBrowserType();
    const deviceName = getDeviceName();
    const platform = detectPlatform();

    // Check if device already exists
    const { data: existingDevice } = await supabase
      .from("admin_fcm_tokens")
      .select("*")
      .eq("user_id", userId)
      .eq("device_id", deviceId)
      .single();

    let data, error;

    if (existingDevice) {
      // Update existing device with new token
      const result = await supabase
        .from("admin_fcm_tokens")
        .update({
          fcm_token: token,
          last_seen: new Date().toISOString(),
          mapped: true,
          enabled: true,
          device_info: {
            ...existingDevice.device_info,
            deviceName,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingDevice.id)
        .select()
        .single();

      data = result.data;
      error = result.error;
      console.log(`Updated admin device token: ${deviceName}`);
    } else {
      // Create new device entry
      const result = await supabase
        .from("admin_fcm_tokens")
        .insert({
          user_id: userId,
          fcm_token: token,
          platform: platform,
          device_id: deviceId,
          browser_type: browserType,
          last_seen: new Date().toISOString(),
          mapped: true,
          enabled: true,
          device_info: {
            userAgent: navigator.userAgent,
            deviceName,
            timestamp: new Date().toISOString(),
          },
        })
        .select()
        .single();

      data = result.data;
      error = result.error;
      console.log(`Created new admin device: ${deviceName}`);
    }

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

// Get all FCM tokens for a user from user_fcm_tokens table
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
        mapped,
        enabled,
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

// Get all FCM tokens for an admin from admin_fcm_tokens table
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
        mapped,
        enabled,
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

// Toggle device-specific push notifications for user context
export async function toggleUserDeviceNotifications(userId, fcmToken, enabled) {
  if (!userId || !fcmToken) return false;

  try {
    const { error } = await supabase
      .from("user_fcm_tokens")
      .update({ 
        enabled: enabled,
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

// Toggle device-specific push notifications for admin context
export async function toggleAdminDeviceNotifications(userId, fcmToken, enabled) {
  if (!userId || !fcmToken) return false;

  try {
    const { error } = await supabase
      .from("admin_fcm_tokens")
      .update({ 
        enabled: enabled,
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

// Update last activity timestamp for current device in user context
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
          deviceName: getLegacyDeviceName(navigator.userAgent, detectPlatform()),
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

// Update last activity timestamp for current device in admin context
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
          deviceName: getLegacyDeviceName(navigator.userAgent, detectPlatform()),
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

// Deactivate FCM token in user_fcm_tokens table
export async function deactivateUserFcmToken(userId, token) {
  if (!userId || !token) return;

  try {
    const { error } = await supabase
      .from("user_fcm_tokens")
      .update({ mapped: false })
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

// Deactivate FCM token in admin_fcm_tokens table
export async function deactivateAdminFcmToken(userId, token) {
  if (!userId || !token) return;

  try {
    const { error } = await supabase
      .from("admin_fcm_tokens")
      .update({ mapped: false })
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

// Get the current device's FCM token
export async function getCurrentDeviceFcmToken() {
  try {
    const token = await getFcmToken();
    return token;
  } catch (error) {
    console.error("Error getting current device FCM token:", error);
    return null;
  }
}

// Full flow for user: Check support, request permission, get token, send to user_fcm_tokens
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

// Full flow for admin: Check support, request permission, get token, send to admin_fcm_tokens
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

// Context-aware token saving based on current user role
export async function saveFcmTokenForCurrentContext(userId, token, userRole) {
  if (userRole === 'admin') {
    return await saveAdminFcmToken(userId, token);
  } else {
    return await saveUserFcmToken(userId, token);
  }
}

// Backward compatibility function for updateDeviceActivity
export async function updateDeviceActivity(userId, userRole = 'user') {
  if (userRole === 'admin') {
    await updateAdminDeviceActivity(userId);
  } else {
    await updateUserDeviceActivity(userId);
  }
}

// Clean up duplicate tokens for the same user device
export async function deduplicateUserTokens(userId) {
  if (!userId) return;

  try {
    const { data: devices } = await supabase
      .from('user_fcm_tokens')
      .select('*')
      .eq('user_id', userId)
      .order('last_seen', { ascending: false });

    if (!devices || devices.length <= 1) return;

    // Group by device_id and keep most recent
    const deviceGroups = new Map();
    devices.forEach(device => {
      const deviceId = device.device_id || 'unknown';
      if (!deviceGroups.has(deviceId)) {
        deviceGroups.set(deviceId, []);
      }
      deviceGroups.get(deviceId).push(device);
    });

    // Deactivate duplicates
    for (const [deviceId, deviceList] of deviceGroups) {
      if (deviceList.length > 1) {
        const duplicates = deviceList.slice(1); // Keep first (most recent)
        for (const duplicate of duplicates) {
          await supabase
            .from('user_fcm_tokens')
            .update({ mapped: false })
            .eq('id', duplicate.id);
        }
        console.log(`Deactivated ${duplicates.length} duplicate user tokens for device ${deviceId}`);
      }
    }
  } catch (error) {
    console.error('Error deduplicating user tokens:', error);
  }
}

// Clean up duplicate tokens for the same admin device
export async function deduplicateAdminTokens(userId) {
  if (!userId) return;

  try {
    const { data: devices } = await supabase
      .from('admin_fcm_tokens')
      .select('*')
      .eq('user_id', userId)
      .order('last_seen', { ascending: false });

    if (!devices || devices.length <= 1) return;

    // Group by device_id and keep most recent
    const deviceGroups = new Map();
    devices.forEach(device => {
      const deviceId = device.device_id || 'unknown';
      if (!deviceGroups.has(deviceId)) {
        deviceGroups.set(deviceId, []);
      }
      deviceGroups.get(deviceId).push(device);
    });

    // Deactivate duplicates
    for (const [deviceId, deviceList] of deviceGroups) {
      if (deviceList.length > 1) {
        const duplicates = deviceList.slice(1); // Keep first (most recent)
        for (const duplicate of duplicates) {
          await supabase
            .from('admin_fcm_tokens')
            .update({ mapped: false })
            .eq('id', duplicate.id);
        }
        console.log(`Deactivated ${duplicates.length} duplicate admin tokens for device ${deviceId}`);
      }
    }
  } catch (error) {
    console.error('Error deduplicating admin tokens:', error);
  }
}
