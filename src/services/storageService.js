import { supabase } from "../lib/supabaseClient";

/* ---------- Path Helpers ---------- */

// Generate a standardized object path
export function objectPath(entity, entityId, category, type, ext, { versioned = true } = {}) {
  const ts = Date.now();
  const filename = versioned
    ? `${type}-${ts}.${ext}`   // e.g. government-id-1692288399999.jpg
    : `${type}.${ext}`;        // e.g. avatar.jpg (always overwritten)

  return `${entity}/${entityId}/${category}/${filename}`;
}

/* ---------- File Operations ---------- */

// Upload a file to a private bucket
export async function uploadFile(bucket, file, path) {
  if (!file) throw new Error("File missing");

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false, // safer: avoid overwrites unless intended
  });
  if (error) throw error;

  return path; // return the key
}

// Generate a signed URL for private file
export async function getSignedUrl(bucket, key, { expiresIn = 3600, transform } = {}) {
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .createSignedUrl(key, expiresIn, transform ? { transform } : {});
  if (error) throw error;

  return data.signedUrl;
}

// Delete a file
export async function deleteFile(bucket, key) {
  const { error } = await supabase.storage.from(bucket).remove([key]);
  if (error) throw error;

  return true;
}
