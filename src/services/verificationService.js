import { supabase } from "../lib/supabaseClient"

// Get user's current verification status
export async function getVerificationStatus(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("verification_status")
    .eq("id", userId)
    .single()

  if (error) throw new Error(`Failed to fetch verification status: ${error.message}`)
  return data.verification_status
}

// Check if user is verified
export async function isUserVerified(userId) {
  const status = await getVerificationStatus(userId)
  return status === "verified"
}

// Admin: update user's verification status
export async function adminUpdateVerificationStatus(userId, status) {
  const { error } = await supabase
    .from("users")
    .update({ verification_status: status })
    .eq("id", userId)

  if (error) throw new Error(`Failed to update verification status: ${error.message}`)
}
