/******************************************************************************
 * AUTH SERVICE  –  v2
 * ---------------------------------------------------------------------------
 * • Creates the auth user
 * • Uploads private KYC images
 * • Inserts a profile row with snake-case column names
 ******************************************************************************/

import { supabase } from "../lib/supabaseClient.js"

/* ---------- helpers ------------------------------------------------------ */

const objectPath = (uid, type) => `${uid}/${type}-${Date.now()}.jpg`

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
const toDbRow = (uid, userData, natKey, selfieKey) => ({
  id: uid,
  first_name:      userData.firstName,
  last_name:       userData.lastName,
  middle_initial:  userData.middleInitial,
  email:           userData.email,
  address:         userData.address,
  contact_number:  userData.contactNumber,
  national_id_key: natKey,
  selfie_id_key:   selfieKey,
  // role, created_at are optional and can be defaulted in the DB
})

/* ---------- exports ------------------------------------------------------ */

/** SIGN-UP: auth ➜ file uploads ➜ profile insert */
export const signUp = async (
  email,
  password,
  userData,       // camel-case keys from the form
  nationalIDFile,
  selfieFile
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
    const natKey   = await uploadPrivate(
      "national-ids",
      nationalIDFile,
      objectPath(uid, "nat")
    )
    const selfieKey = await uploadPrivate(
      "selfie-ids",
      selfieFile,
      objectPath(uid, "selfie")
    )

    /* 3. Insert profile row with correct column names */
    const { error: dbErr } = await supabase
      .from("users")
      .insert(toDbRow(uid, userData, natKey, selfieKey))

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
