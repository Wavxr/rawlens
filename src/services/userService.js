import { supabase } from "../lib/supabaseClient"

/**
 * Fetch all users for the admin dashboard.
 */
export async function fetchUsers() {
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, first_name, last_name, email, role, national_id_key, selfie_id_key, created_at, contact_number, address, verification_status"
    )
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`)
  }

  return data || []
}

/**
 * Update a user's verification status: 'approved', 'rejected', or 'pending'.
 * Only used by admins.
 */
export async function updateVerificationStatus(userId, status) {
  const { error } = await supabase
    .from("users")
    .update({ verification_status: status })
    .eq("id", userId)

  if (error) {
    throw new Error(`Failed to update verification status: ${error.message}`)
  }
}

/**
 * Fetch a single user by ID.
 */
export async function fetchUserById(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch user: ${error.message}`)
  }

  return data
}

/**
 * Update editable user profile fields.
 */
export async function updateUserProfile(userId, updates) {
  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)

  if (error) {
    throw new Error(`Failed to update user profile: ${error.message}`)
  }
}
