import { supabase } from "../lib/supabaseClient";

/* ---------- Path Helpers ---------- */

// Generate a standardized object path
export function objectPath(entityId, type, ext, { versioned = true } = {}) {
  const ts = Date.now();
  const filename = versioned ? `${type}-${ts}.${ext}` : `${type}.${ext}`;
  return `${entityId}/${filename}`;
}


/* ---------- File Operations ---------- */

// Upload a file to a private bucket
export async function uploadFile(bucket, path, file) {
  if (!file) throw new Error("File missing");
  if (!path) throw new Error("Path is required");
  
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: file.type,
        upsert: true,
        cacheControl: '3600'
      });
    if (error) {
      throw error;
    }

    return path;
  } catch (error) {
    throw error;
  }
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
