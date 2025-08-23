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
    // always wrap single userId into an array
    const ids = Array.isArray(userIds) ? userIds : [userIds]

    const notification = { title, body, data }

    return await callEdge("send-push", { userIds: ids, notification })
  } catch (err) {
    console.error("❌ Failed to send push notification:", err)
  }
}

// --- send push to all admins ---
export async function sendPushToAdmins(title, body, data = {}) {
  try {
    // fetch all admins from your users table
    const { data: admins, error } = await supabase
      .from("users")
      .select("id")
      .eq("role", "admin")

    if (error) throw error
    if (!admins?.length) return

    const userIds = admins.map((u) => u.id)
    const notification = { title, body, data }

    return await callEdge("send-push", { userIds, notification })
  } catch (err) {
    console.error("❌ Failed to send push to admins:", err)
  }
}

// --- ensure user is subscribed ---
export async function ensureSubscribed(userId) {
  if (!userId) return
  try {
    console.log(`🔔 Ensuring push subscription for user: ${userId}`)
    // Later: navigator.serviceWorker.register + pushManager.subscribe goes here
  } catch (err) {
    console.error("❌ ensureSubscribed failed:", err)
  }
}
