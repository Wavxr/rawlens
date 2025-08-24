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

/**
 * Save or update FCM token in Supabase
 * Includes platform (web) and device info
 */
export async function saveFcmToken(userId, token) {
  if (!userId || !token) return;

  try {
    await supabase
      .from("user_fcm_tokens")
      .upsert({
        user_id: userId,
        fcm_token: token,
        platform: "web",
        device_info: { userAgent: navigator.userAgent },
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("fcm_token", token); // ensures no duplicate
    console.log("✅ FCM token saved/updated successfully");
  } catch (err) {
    console.error("❌ Failed to save FCM token:", err);
  }
}

/**
 * Full flow: Check support, request permission, get token, send to Supabase
 */
export async function registerPushForUser(userId) {
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

  await saveFcmToken(userId, token);
  return true;
}
