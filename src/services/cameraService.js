// services/cameraService.js
import { supabase } from "../lib/supabaseClient";

// --- Constants ---
const CAMERA_SELECT_QUERY = `
  id,
  name,
  description,
  image_url,
  created_at,
  serial_number,
  purchase_date,
  cost,
  camera_status,
  camera_condition,
  camera_pricing_tiers (
    id,
    camera_id,
    min_days,
    max_days,
    price_per_day,
    description
  )
`;

// --- Private Helper Functions ---
const generateFileName = (cameraName) => 
  `${cameraName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.jpg`;

async function uploadCameraImage(file, cameraName) {
  if (!file) return { key: null, publicUrl: null };

  const fileName = generateFileName(cameraName);

  const { error: uploadError } = await supabase.storage
    .from("cameras")
    .upload(fileName, file, { upsert: false });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const { data } = supabase.storage
    .from("cameras")
    .getPublicUrl(fileName);

  return { key: fileName, publicUrl: data.publicUrl };
}

// --- Camera CRUD Operations ---

export async function insertCamera(cameraData, imageFile) {
  try {
    const uploadResult = await uploadCameraImage(imageFile, cameraData.name);
    const imageUrl = uploadResult.publicUrl;

    // Insert camera
    const { data: cameraDataResult, error: cameraError } = await supabase
      .from("cameras")
      .insert({
        name: cameraData.name.trim(),
        description: cameraData.description.trim(),
        image_url: imageUrl,
        serial_number: cameraData.serial_number || null,
        purchase_date: cameraData.purchase_date || null,
        cost: cameraData.cost ? parseFloat(cameraData.cost) : null,
        camera_status: cameraData.camera_status || 'available',
        camera_condition: cameraData.camera_condition || null
      })
      .select();

    if (cameraError) throw cameraError;

    const newCameraId = cameraDataResult[0]?.id;
    if (!newCameraId) {
      throw new Error("Failed to retrieve ID of the newly created camera.");
    }

    // Insert pricing tiers
    const standardPrice = parseFloat(cameraData.pricePerDay) || 0;
    const discountedPrice = parseFloat(cameraData.discountedPricePerDay) || standardPrice;

    const pricingTiers = [
      {
        camera_id: newCameraId,
        min_days: 1,
        max_days: 3,
        price_per_day: standardPrice,
        description: "Standard Rate",
      },
      {
        camera_id: newCameraId,
        min_days: 4,
        max_days: null,
        price_per_day: discountedPrice,
        description: "Discounted Rate",
      },
    ];

    const { error: pricingError } = await supabase
      .from("camera_pricing_tiers")
      .insert(pricingTiers);

    if (pricingError) throw pricingError;

    return { success: true, data: { id: newCameraId } };
  } catch (error) {
    console.error("Error in insertCamera:", error);
    return { error };
  }
}

export async function getCamera(cameraId) {
  return await supabase
    .from("cameras")
    .select(CAMERA_SELECT_QUERY)
    .eq("id", cameraId)
    .maybeSingle();
}

export async function getAllCameras() {
  return await supabase
    .from("cameras")
    .select(CAMERA_SELECT_QUERY)
    .order("created_at", { ascending: false });
}

export async function updateCamera(id, cameraData, imageFile = null) {
  try {
    let imageUrl = cameraData.image_url;

    if (imageFile) {
      const uploadResult = await uploadCameraImage(imageFile, cameraData.name);
      imageUrl = uploadResult.publicUrl;
    }

    // Update camera
    const { error: cameraError } = await supabase
      .from("cameras")
      .update({
        name: cameraData.name.trim(),
        description: cameraData.description.trim(),
        image_url: imageUrl,
        serial_number: cameraData.serial_number || null,
        purchase_date: cameraData.purchase_date || null,
        cost: cameraData.cost ? parseFloat(cameraData.cost) : null,
        camera_status: cameraData.camera_status || 'available',
        camera_condition: cameraData.camera_condition || null
      })
      .eq("id", id);

    if (cameraError) throw cameraError;

    // Update pricing tiers
    const { data: existingTiers, error: fetchError } = await supabase
      .from("camera_pricing_tiers")
      .select("id, min_days, max_days")
      .eq("camera_id", id);

    if (fetchError) throw fetchError;

    const standardPrice = parseFloat(cameraData.pricePerDay) || 0;
    const discountedPrice = parseFloat(cameraData.discountedPricePerDay) || standardPrice;

    const standardTier = existingTiers.find(t => t.min_days === 1 && t.max_days === 3);
    const discountedTier = existingTiers.find(t => t.min_days === 4 && t.max_days === null);

    const updates = [];

    if (standardTier) {
      updates.push(
        supabase
          .from("camera_pricing_tiers")
          .update({ price_per_day: standardPrice })
          .eq("id", standardTier.id)
      );
    }

    if (discountedTier) {
      updates.push(
        supabase
          .from("camera_pricing_tiers")
          .update({ price_per_day: discountedPrice })
          .eq("id", discountedTier.id)
      );
    }

    if (updates.length > 0) {
      const results = await Promise.all(updates);
      const errorResult = results.find(res => res.error);
      if (errorResult) throw errorResult.error;
    }

    return { success: true };
  } catch (error) {
    console.error("Error in updateCamera:", error);
    return { error };
  }
}

export async function deleteCamera(id) {
  try {
    const { data: camera, error: fetchError } = await supabase
      .from("cameras")
      .select("image_url")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!camera) return { error: null };

    // Delete camera record
    const { error: deleteError } = await supabase
      .from("cameras")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    // Delete image from storage
    if (camera.image_url) {
      try {
        const fileName = camera.image_url.split('/').pop();
        if (fileName) {
          await supabase.storage.from("cameras").remove([fileName]);
        }
      } catch (storageError) {
        console.error("Failed to delete image:", storageError);
      }
    }

    return { error: null };
  } catch (error) {
    console.error("Error in deleteCamera:", error);
    return { error };
  }
}