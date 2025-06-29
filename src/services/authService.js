/*******************************************************************************
 * AUTH SERVICE
 * ---------------------------------------------------------------------------
 * Keeps sign-up / sign-in / file-upload logic in one place.
 * 1. signUp   → creates auth account, uploads ID photos, saves profile row
 * 2. signIn   → logs a user in with email + password
 * 3. getCurrentUser → returns the user tied to the current session
 * Helpers:
 *    • generateFileName → builds a unique image name
 *    • uploadFile       → uploads a file and returns its public URL
 ******************************************************************************/

import { supabase } from '../lib/supabaseClient'

// Create a unique filename like "uid-selfie-20250630125000.jpg"
const generateFileName = (userId, type) => {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '')
  return `${userId}-${type}-${timestamp}.jpg`
}

// Upload a file to the chosen bucket and return its public URL
const uploadFile = async (file, userId, folder) => {
  if (!file) return null

  const fileName = generateFileName(userId, folder)
  const { error: uploadError } = await supabase.storage.from(folder).upload(fileName, file)
  if (uploadError) throw uploadError

  const { data, error: urlError } = supabase.storage.from(folder).getPublicUrl(fileName)
  if (urlError) throw urlError

  return data.publicUrl
}

// Sign-up flow: auth account → upload images → save profile row
export const signUp = async (email, password, userData, nationalID, selfieID) => {
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
  if (authError) return { error: authError }

  const userId = authData.user.id

  try {
    const nationalIDUrl = await uploadFile(nationalID, userId, 'national-ids')
    const selfieIDUrl   = await uploadFile(selfieID,   userId, 'selfie-ids')

    const { error: dbError } = await supabase.from('users').insert({
      id:               userId,
      first_name:       userData.firstName,
      last_name:        userData.lastName,
      middle_initial:   userData.middleInitial,
      email,
      address:          userData.address,
      contact_number:   userData.contactNumber,
      national_id_url:  nationalIDUrl,
      selfie_id_url:    selfieIDUrl,
    })
    if (dbError) throw dbError

    return { success: true }
  } catch (error) {
    // Clean up auth user if anything fails
    await supabase.auth.admin.deleteUser(userId)
    return { error }
  }
}

// Basic email-password sign-in
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

// Helper to get the current session user
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser()
  return { user: data?.user, error }
}
