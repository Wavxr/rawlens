import { supabase } from "../lib/supabaseClient";
import { uploadFile, objectPath } from "./storageService.js";

/* ---------- helpers ------------------------------------------------------ */

// Convert camelCase userData ➜ snake_case for DB insert
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

// Flag to track if signup is in progress (prevents auth listener from acting)
let isSignupInProgress = false;

export const getIsSignupInProgress = () => isSignupInProgress;

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
  // Set flag to prevent auth listener from acting
  isSignupInProgress = true;
  let uid = null;
  
  try {
    // 1. Auth
    const { data: auth, error: authErr } = await supabase.auth.signUp({
      email,
      password,
    });
    if (authErr) {
      const msg = authErr.message || 'Sign up failed';
      // Normalize common 422 cases from GoTrue:
      // - existing user
      // - password policy violations
      if (authErr.status === 422 || /registered|already exists/i.test(msg)) {
        return {
          error: {
            code: 'USER_EXISTS',
            message: 'An account already exists for this email. Please sign in.'
          }
        };
      }
      return { error: authErr };
    }

    uid = auth.user.id;

    // 2. Upload KYC files
    const govKey = await uploadFile(
      "government-ids",
      objectPath(uid, "verification", "government-id", "jpg"),
      governmentIdFile
    );

    const selfieKey = await uploadFile(
      "selfie-ids",
      objectPath(uid, "verification", "selfie", "jpg"),
      selfieFile
    );

    const videoKey = await uploadFile(
      "verification-videos",
      objectPath("users", uid, "verification", "video", "webm"),
      verificationVideoFile
    );

    // 3. Insert profile row
    const { error: dbErr } = await supabase
      .from("users")
      .insert(toDbRow(uid, userData, govKey, selfieKey, videoKey));

    if (dbErr) throw dbErr;

    // Note: user_settings will be created by database trigger automatically
    // This avoids RLS/FK race conditions during signup

    // Sign out to prevent auto-login race condition
    // User must explicitly log in after signup (better UX for verification flow anyway)
    try {
      await supabase.auth.signOut();
    } catch (signOutErr) {
      console.warn('Failed to sign out after signup:', signOutErr);
    }

    return { success: true };
  } catch (error) {
    // Rollback: Delete auth user and cleanup files using edge function
    console.error('Profile creation failed, rolling back user creation:', error);
    
    try {
      if (uid) {
        const { error: deleteError } = await supabase.functions.invoke('delete-user', {
          body: { userId: uid }
        });
        
        if (deleteError) {
          console.error('Rollback failed:', deleteError);
        } else {
          console.log('Successfully rolled back user creation');
        }
      }
    } catch (rollbackError) {
      console.error('Rollback error:', rollbackError);
    }
    
    // Ensure the session is cleared so user retries cleanly
    try { await supabase.auth.signOut(); } catch (signOutError) {
      console.warn('Failed to clear session after signup failure:', signOutError);
    }
    
    return { error };
  } finally {
    // CRITICAL: Clear the signup flag
    isSignupInProgress = false;
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
