import { supabase } from "../lib/supabaseClient";

/* ---------- Path Helpers ---------- */

export function objectPath(...args) {
  const ts = Date.now();
  let versioned = true;

  // If the last argument is an options object, extract it.
  if (args.length > 0 && typeof args[args.length - 1] === 'object' && args[args.length - 1] !== null) {
    const opts = args.pop();
    if (typeof opts.versioned === 'boolean') {
      versioned = opts.versioned;
    }
  }

  if (args.length < 2) {
    throw new Error('objectPath: requires at least a filename and an extension.');
  }

  const ext = args.pop();
  const filename = args.pop();
  
  const finalFilename = versioned ? `${filename}-${ts}.${ext}` : `${filename}.${ext}`;
  
  return [...args, finalFilename].join('/');
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
    
    if (error) throw new Error(`Upload failed: ${error.message}`);
    
    return path;
  } catch (error) {
    console.error("Upload error:", error);
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
