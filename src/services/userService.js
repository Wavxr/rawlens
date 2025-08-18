import { supabase } from "../lib/supabaseClient"
import { uploadFile, deleteFile, objectPath } from "./storageService"

// Get all users (for admin dashboard).
export async function getUsers() {
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, first_name, last_name, email, role, government_id_key, selfie_id_key, verification_video_key, created_at, contact_number, address, verification_status"
    )
    .order("created_at", { ascending: false })

  if (error) throw new Error(`Failed to get users: ${error.message}`)
  return data || []
}

// Get a single user by ID.
export async function getUserById(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single()

  if (error) throw new Error(`Failed to get user: ${error.message}`)
  return data
}

/**
 * Update user profile.
 *
 * @param {string} userId - The ID of the user being updated.
 * @param {object} updates - Editable fields (first_name, last_name, middle_initial, contact_number, address).
 * @param {object} files - Optional media files to upload.
 *   Keys: government_id_key, selfie_id_key, verification_video_key.
 *   Each value should be a File object.
 *
 * Handles:
 * - Deleting old media file if replaced
 * - Uploading new media file
 * - Updating DB with new storage key
 */
export async function updateUserProfile(userId, updates, files = {}) {
  // Remove forbidden fields
  const forbidden = ["id", "email", "created_at", "role", "verification_status"]
  forbidden.forEach(field => delete updates[field])

  // Map columns to their storage buckets
  const mediaBuckets = {
    government_id_key: "government-ids",
    selfie_id_key: "selfie-ids",
    verification_video_key: "verification-videos",
  }

  // Fetch user once
  const user = await getUserById(userId)

  for (const key in mediaBuckets) {
    const bucket = mediaBuckets[key]
    const file = files[key]
    if (!file) continue

    // Delete old file if exists
    const oldKey = user[key]
    if (oldKey) {
      try {
        await deleteFile(bucket, oldKey)
      } catch (err) {
        console.warn(`Failed to delete old file ${oldKey}: ${err.message}`)
      }
    }

    // Upload new file with standardized path
    const newKey = objectPath(userId, key, file)
    await uploadFile(bucket, newKey, file)
    updates[key] = newKey
  }

  // Update database
  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)

  if (error) throw new Error(`Failed to update profile: ${error.message}`)
}
