/******************************************************************************
 * Profile.jsx
 * ----------------------------------------------------------------------------
 * Display the currently-logged-in user’s uploaded ID photos (national ID +
 * selfie-with-ID). The images live in **private** Supabase buckets, so we use
 * `createSignedUrl()` (wrapped in `signedUrl()` helper) to fetch short-lived
 * thumbnail URLs.
 *
 * 1. On mount   → query `users` table for the two object keys.
 * 2. If keys exist → fetch signed URLs in parallel, store in `imgs` state.
 * 3. Render thumbnails; fallback text if none were uploaded yet.
 ******************************************************************************/

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { signedUrl } from "../../lib/storage.js";

export default function Profile() {
  /* ─────────────────────────────────────
     Reactive state
     ─────────────────────────────────────*/
  const [imgs,    setImgs]    = useState({ nat: null, selfie: null, video: null }); // signed URLs
  const [loading, setLoading] = useState(true);                        // initial spinner

  /* ─────────────────────────────────────
     Fetch keys on first render
     ─────────────────────────────────────*/
  useEffect(() => {
    async function loadImages() {
      /* 1️  Pull the two object keys for the current user */
      const { data: row, error } = await supabase
        .from("users")
        .select("government_id_key, selfie_id_key, verification_video_key")
        .maybeSingle();               // returns null—not 406—if row missing

      if (error) {
        console.error("Profile fetch error:", error);
        setLoading(false);
        return;
      }
      if (!row) {                     // user row genuinely absent
        setLoading(false);
        return;
      }

      /* 2️  Generate signed thumbnails (400 px, 1 h expiry) in parallel */
      try {
        const [natUrl, selfieUrl, videoUrl] = await Promise.all([
          signedUrl("government-ids",  row.government_id_key, { width: 400 }),
          signedUrl("selfie-ids",    row.selfie_id_key,   { width: 400 }),
          signedUrl("verification-videos", row.verification_video_key),
        ]);
        setImgs({ nat: natUrl, selfie: selfieUrl, video: videoUrl });
      } catch (e) {
        console.error("Signed-URL error:", e);
      }

      setLoading(false);
    }

    loadImages();
  }, []);

  /* ─────────────────────────────────────
     Render
     ─────────────────────────────────────*/
  if (loading) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="space-y-4">
      {/* National-ID thumbnail */}
      {imgs.nat && (
        <img
          src={imgs.nat}
          alt="National ID"
          loading="lazy"
          className="w-48 rounded border"
        />
      )}

      {/* Selfie-with-ID thumbnail */}
      {imgs.selfie && (
        <img
          src={imgs.selfie}
          alt="Selfie with ID"
          loading="lazy"
          className="w-48 rounded border"
        />
      )}

      {/* Verification Video */}
      {imgs.video && (
        <video
          src={imgs.video}
          controls
          className="w-72 rounded border"
        />
      )}

      {/* Fallback if no files uploaded */}
      {!imgs.nat && !imgs.selfie && !imgs.video && (
        <p className="text-gray-500">No ID images or video on file.</p>
      )}
    </div>
  );
}
