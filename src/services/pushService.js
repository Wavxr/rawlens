// src/services/pushService.js
import { supabase } from "../lib/supabaseClient"

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

// --- core edge caller ---
async function callEdge(functionName, payload) {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    if (!token) throw new Error("No auth token found")

    const res = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) throw new Error(await res.text())
    return await res.json()
  } catch (err) {
    console.error("❌ callEdge error:", err)
    throw err
  }
}

// --- send push to a specific user (or users) ---
export async function sendPushNotification(userIds, title, body, data = {}) {
  try {
    if (!userIds) return
    const ids = Array.isArray(userIds) ? userIds : [userIds]
    if (ids.length === 0) return

    // Fetch settings for the users and filter out those who disabled pushes
    const { data: usersWithSettings, error } = await supabase
      .from("user_settings")
      .select("user_id")
      .in("user_id", ids)
      .eq("push_notifications", true)

    if (error) throw error

    const enabledUserIds = usersWithSettings.map((s) => s.user_id)

    if (enabledUserIds.length === 0) {
      console.log("🔕 Push notifications are disabled for all target users.")
      return
    }

    const notification = { title, body, data }

    return await callEdge("send-push", { userIds: enabledUserIds, notification })
  } catch (err) {
    console.error("❌ Failed to send push notification:", err)
  }
}

// --- send push to all admins ---
export async function sendPushToAdmins(title, body, data = {}) {
  try {
    // first get all admin IDs
    const { data: admins, error: adminsError } = await supabase
      .from("users")
      .select("id")
      .eq("role", "admin")

    if (adminsError) throw adminsError
    if (!admins?.length) return

    const adminIds = admins.map((u) => u.id)

    // now filter based on push settings
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("user_id")
      .in("user_id", adminIds)
      .eq("push_notifications", true)

    if (settingsError) throw settingsError
    if (!settings?.length) return

    const enabledAdminIds = settings.map((s) => s.user_id)
    const notification = { title, body, data }

    return await callEdge("send-push", { userIds: enabledAdminIds, notification })
  } catch (err) {
    console.error("❌ Failed to send push to admins:", err)
  }
}

// --- ensure user is subscribed ---
export async function ensureSubscribed(userId) {
  if (!userId) return
  try {
    console.log(`🔔 Ensuring push subscription for user: ${userId}`)
    // TODO: navigator.serviceWorker.register + pushManager.subscribe
  } catch (err) {
    console.error("❌ ensureSubscribed failed:", err)
  }
}
