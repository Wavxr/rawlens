/**
 * Return a CDN-backed, resized, signed URL for a private object.
 */
import { supabase } from "./supabaseClient.js";

export const signedUrl = async (
  bucket,
  key,
  {
    width     = 400,   // px
    quality   = 70,    // jpeg quality
    expiresIn = 3600,  // 1 h  ← default guarantees an integer
  } = {}
) => {
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .createSignedUrl(key, expiresIn, {
      transform: { width, quality, resize: "cover" },
    });

  if (error) throw error;
  return data.signedUrl;
};
