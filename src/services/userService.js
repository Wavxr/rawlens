import { supabase } from "../lib/supabaseClient"
import { uploadFile, deleteFile, objectPath } from "./storageService"

// --- Constants ---
const mediaBuckets = {
    government_id_key: "government-ids",
    selfie_id_key: "selfie-ids",
    verification_video_key: "verification-videos",
  };

// ------------------------------------------
//    -- Helper Functions --
// ------------------------------------------

// Get all users (for admin dashboard).
export async function getUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, role, government_id_key, selfie_id_key, verification_video_key, created_at, contact_number, address, verification_status, is_appealing")
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

// Update user profile — handles uploading/replacing media files and updating DB storage keys
export async function updateUserProfile(userId, updates, files = {}) {
  const forbidden = ["id", "email", "created_at", "role", "verification_status", "is_appealing"];
  forbidden.forEach(field => delete updates[field]);

  const user = await getUserById(userId);

  let resubmittedVerification = false;

  for (const key in mediaBuckets) {
    const bucket = mediaBuckets[key];
    const file = files[key];
    if (!file || !file.name) continue;

    const fileExt = file.name.split('.').pop();
    const fileType = key.replace('_key', '').replace(/_/g, '-');

    // Use objectPath to generate the storage key
    const newKey = objectPath(userId, fileType, fileExt);

    try {
      // Upload new file first
      await uploadFile(bucket, newKey, file);

      // Delete the old file if it exists
      const oldKey = user[key];
      if (oldKey) {
        try {
          await deleteFile(bucket, oldKey);
        } catch {
          // ignore deletion errors
        }
      }

      // Update the reference to the new file
      updates[key] = newKey;

      // Flag as resubmitted verification
      resubmittedVerification = true;
    } catch (error) {
      throw new Error(`Failed to upload ${fileType}: ${error.message}`);
    }
  }

  // If user resubmits any verification docs → mark appeal
  if (resubmittedVerification) {
    updates.is_appealing = true;
  }

  // Update database
  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId);

  if (error) throw new Error(`Failed to update profile: ${error.message}`);
}

// Deletes a user and all their associated data by invoking a Supabase Edge Function (userId)
export async function deleteUser(userId) {
  if (!userId) throw new Error("User ID is required to delete a user.");
  const { data, error } = await supabase.functions.invoke('delete-user', {
    body: { userId },
  });

  if (error) throw new Error(`Failed to delete user: ${error.message}`);
  
  return data;
}

// Creates a user profile in the public.users table after an orphaned auth user logs in for the first time
export async function createUserProfile(userId, userData, kycData) {
  try {
    // 1. Upload KYC files
    const govKey = await uploadFile(
      "government-ids",
      objectPath(userId, "verification", "government-id", "jpg"),
      kycData.governmentIdFile
    );

    const selfieKey = await uploadFile(
      "selfie-ids",
      objectPath(userId, "verification", "selfie", "jpg"),
      kycData.selfieFile
    );

    const videoKey = await uploadFile(
      "verification-videos",
      objectPath(userId, "verification", "video", "webm"),
      kycData.verificationVideoFile
    );

    // 2. Prepare user profile data for insertion
    const profileData = {
      id: userId,
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
    };

    // 3. Insert profile row
    const { data, error: dbErr } = await supabase
      .from("users")
      .insert(profileData)
      .select()
      .single();

    if (dbErr) {
      // Handle potential race condition where profile was created in another tab
      if (dbErr.code === '23505') { // unique_violation
        console.warn('User profile already exists. Fetching existing profile.');
        const { data: existingProfile, error: fetchErr } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        if (fetchErr) throw fetchErr;
        return { data: existingProfile, error: null };
      }
      throw dbErr;
    }

    return { data, error: null };
  } catch (error) {
    console.error("Error creating user profile:", error);
    return { data: null, error };
  }
}