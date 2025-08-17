/******************************************************************************
 * AUTH SERVICE  –  v2
 * ---------------------------------------------------------------------------
 * • Creates the auth user
 * • Uploads private KYC images
 * • Inserts a profile row with snake-case column names
 ******************************************************************************/

import { supabase } from "../lib/supabaseClient.js"

/* ---------- helpers ------------------------------------------------------ */

const objectPath = (uid, type, ext) => `${uid}/${type}-${Date.now()}.${ext}`

const uploadPrivate = async (bucket, file, path) => {
  if (!file) throw new Error("File missing")

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error
  return path // return the key only
}

/** Convert camelCase userData ➜ snake_case for DB insert */
const toDbRow = (uid, userData, govKey, selfieKey, videoKey) => ({
  id: uid,
  first_name:      userData.firstName,
  last_name:       userData.lastName,
  middle_initial:  userData.middleInitial,
  email:           userData.email,
  address:         userData.address,
  contact_number:  userData.contactNumber,
  government_id_key: govKey,
  selfie_id_key:   selfieKey,
  verification_video_key: videoKey,
  role: "user",
  verification_status: "pending",
})

/* ---------- exports ------------------------------------------------------ */

/** SIGN-UP: auth ➜ file uploads ➜ profile insert */
export const signUp = async (
  email,
  password,
  userData,       // camel-case keys from the form
  governmentIdFile,
  selfieFile,
  verificationVideoFile
) => {
  /* 1. Create auth account */
  const { data: auth, error: authErr } = await supabase.auth.signUp({
    email,
    password,
  })
  if (authErr) return { error: authErr }

  const uid = auth.user.id

  try {
    /* 2. Upload KYC files to private buckets */
    const govKey = await uploadPrivate(
      "government-ids",
      governmentIdFile,
      objectPath(uid, "gov-id", "jpg")
    )
    const selfieKey = await uploadPrivate(
      "selfie-ids",
      selfieFile,
      objectPath(uid, "selfie", "jpg")
    )
    const videoKey = await uploadPrivate(
      "verification-videos",
      verificationVideoFile,
      objectPath(uid, "verification", "webm")
    )

    /* 3. Insert profile row with correct column names */
    const { error: dbErr } = await supabase
      .from("users")
      .insert(toDbRow(uid, userData, govKey, selfieKey, videoKey))

    if (dbErr) throw dbErr

    return { success: true }
  } catch (err) {
    // rollback auth user if anything else failed
    await supabase.auth.admin.deleteUser(uid)
    return { error: err }
  }
}

/** EMAIL - PASSWORD SIGN-IN */
export const signIn = async (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

/** CURRENT SESSION USER */
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser()
  return { user: data?.user, error }
}
