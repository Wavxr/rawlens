import { supabase } from "../lib/supabaseClient";
import { uploadFile, objectPath } from "./storageService.js";

/* ---------- helpers ------------------------------------------------------ */

/** Convert camelCase userData ➜ snake_case for DB insert */
const toDbRow = (uid, userData, govKey, selfieKey, videoKey) => ({
  id: uid,
  first_name: userData.firstName,
  last_name: userData.lastName,
  middle_initial: userData.middleInitial,
  email: userData.email,
  address: userData.address,
  contact_number: userData.contactNumber,
  government_id_key: govKey,
  selfie_id_key: selfieKey,
  verification_video_key: videoKey,
  role: "user",
  verification_status: "pending",
});

/* ---------- exports ------------------------------------------------------ */

/**
 * SIGN-UP FLOW:
 * 1. Create auth account
 * 2. Upload KYC files
 * 3. Insert user profile row
 */
export async function signUp(
  email,
  password,
  userData,               
  governmentIdFile,
  selfieFile,
  verificationVideoFile
) {
  // 1. Auth
  const { data: auth, error: authErr } = await supabase.auth.signUp({
    email,
    password,
  });
  if (authErr) return { error: authErr };

  const uid = auth.user.id;

  try {
    // 2. Upload KYC files
    const govKey = await uploadFile(
      "government-ids",
      governmentIdFile,
      objectPath("users", uid, "verification", "government-id", "jpg")
    );

    const selfieKey = await uploadFile(
      "selfie-ids",
      selfieFile,
      objectPath("users", uid, "verification", "selfie", "jpg")
    );

    const videoKey = await uploadFile(
      "verification-videos",
      verificationVideoFile,
      objectPath("users", uid, "verification", "video", "webm")
    );

    // 3. Insert profile row
    const { error: dbErr } = await supabase
      .from("users")
      .insert(toDbRow(uid, userData, govKey, selfieKey, videoKey));

    if (dbErr) throw dbErr;

    return { success: true };
  } catch (err) {
    // Rollback user if signup fails after auth
    await supabase.auth.admin.deleteUser(uid);
    return { error: err };
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
