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
    // First, check if token already exists
    const { data: existingToken, error: checkError } = await supabase
      .from("user_fcm_tokens")
      .select("id, is_active")
      .eq("user_id", userId)
      .eq("fcm_token", token)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    if (existingToken) {
      // Update existing token to active
      const { error: updateError } = await supabase
        .from("user_fcm_tokens")
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingToken.id);

      if (updateError) throw updateError;
      console.log("✅ Updated existing token to active");
    } else {
      // Insert new token
      const { error: insertError } = await supabase
        .from("user_fcm_tokens")
        .insert({
          user_id: userId,
          fcm_token: token,
          platform: "web",
          is_active: true,
          device_info: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
        });

      if (insertError) throw insertError;
      console.log("✅ Inserted new active token");
    }

    // Deactivate any other tokens for this user (optional)
    const { error: deactivateError } = await supabase
      .from("user_fcm_tokens")
      .update({ is_active: false })
      .eq("user_id", userId)
      .neq("fcm_token", token);

    if (deactivateError) {
      console.warn("Warning: Could not deactivate old tokens:", deactivateError);
    }
  } catch (error) {
    console.error("Error saving FCM token:", error);
    throw error;
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
