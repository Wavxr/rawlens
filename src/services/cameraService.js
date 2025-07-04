/**************************************************************************
 * cameraService.js
 * ------------------------------------------------------------------------
 * CRUD helpers for the “cameras” feature.
 * • uploadCameraImage()   –> uploads to /<fileName>.jpg and returns key+URL
 * • insertCamera()        –> create row + image
 * • updateCamera()        –> optional new image
 * • deleteCamera()        –> remove row (image file left in bucket)
 **************************************************************************/

import { supabase } from "../lib/supabaseClient";

/* ───────────────────────────────────────────────────────── helpers ────── */

/** Make a unique name like "canon-r5-1720051122334.jpg" */
const generateFileName = (cameraName) =>
  `${cameraName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.jpg`;

/**
 * Upload `File` to **private** bucket "cameras" and return { key, publicUrl }.
 * The file is placed at   cameras/<fileName>.jpg
 */
async function uploadCameraImage(file, cameraName) {
  if (!file) return { key: null, publicUrl: null };

  const fileName = generateFileName(cameraName);

  /* 1️ Upload – RLS policy above must allow admin to insert */
  const { error: uploadErr } = await supabase.storage
    .from("cameras")
    .upload(fileName, file, { upsert: false });
  if (uploadErr) throw uploadErr;

  /* 2️ Turn it into a public URL (bucket is public) OR
         createSignedUrl() if you keep bucket private */
  const { data, error: urlErr } = supabase.storage
    .from("cameras")
    .getPublicUrl(fileName);
  if (urlErr) throw urlErr;

  return { key: fileName, publicUrl: data.publicUrl };
}

/* ───────────────────────────────────────────────────────── exports ───── */

export async function insertCamera(cameraData, imageFile) {
  try {
    const { publicUrl } = await uploadCameraImage(imageFile, cameraData.name);

    const { error } = await supabase.from("cameras").insert({
      name:         cameraData.name,
      description:  cameraData.description,
      price_per_day: parseFloat(cameraData.pricePerDay),
      image_url:    publicUrl,
      available:    true,
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { error };
  }
}

export async function getAllCameras() {
  return await supabase
    .from("cameras")
    .select("*")
    .order("created_at", { ascending: false });
}

export async function updateCamera(id, cameraData, imageFile = null) {
  try {
    /* replace image only if user selected a new one */
    let image_url = cameraData.image_url;
    if (imageFile) {
      const { publicUrl } = await uploadCameraImage(
        imageFile,
        cameraData.name
      );
      image_url = publicUrl;
    }

    const { error } = await supabase
      .from("cameras")
      .update({
        name:         cameraData.name,
        description:  cameraData.description,
        price_per_day: parseFloat(cameraData.pricePerDay),
        image_url,
        available:    cameraData.available,
      })
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { error };
  }
}

export async function deleteCamera(id) {
  const { error } = await supabase.from("cameras").delete().eq("id", id);
  return { error };
}
