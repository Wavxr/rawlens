// services/cameraService.js
// ===================================================================
// CRUD helpers for the "cameras" and "camera_pricing_tiers" features.
// ===================================================================

import { supabase } from "../lib/supabaseClient";

// --- Private Helper Functions ---

const generateFileName = (cameraName) => `${cameraName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.jpg`;

async function uploadCameraImage(file, cameraName) {
  if (!file) return { key: null, publicUrl: null };

  const fileName = generateFileName(cameraName);

  const { error: uploadError } = await supabase.storage
    .from("cameras")
    .upload(fileName, file, { upsert: false });

  if (uploadError) {
    console.error("Image upload error:", uploadError);
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const { data: urlData, error: urlError } = supabase.storage
    .from("cameras")
    .getPublicUrl(fileName);

  if (urlError) {
    console.error("Get public URL error:", urlError);
    throw new Error(`Failed to get image URL: ${urlError.message}`);
  }

  return { key: fileName, publicUrl: urlData.publicUrl };
}

// --- Camera CRUD Operations ---

export async function insertCamera(cameraData, imageFile) {
  let imageUrl = null;

  try {
    const uploadResult = await uploadCameraImage(imageFile, cameraData.name);
    imageUrl = uploadResult.publicUrl;

    const { data: cameraInsertData, error: cameraInsertError } = await supabase
      .from("cameras")
      .insert({
        name: cameraData.name.trim(),
        description: cameraData.description.trim(),
        image_url: imageUrl,
        available: true,
      })
      .select();

    if (cameraInsertError) throw cameraInsertError;

    const newCameraId = cameraInsertData[0]?.id;
    if (!newCameraId) {
      throw new Error("Failed to retrieve ID of the newly created camera.");
    }

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

    const { error: pricingInsertError } = await supabase
      .from("camera_pricing_tiers")
      .insert(pricingTiers);

    if (pricingInsertError) throw pricingInsertError;

    return { success: true, data: { id: newCameraId } };
  } catch (error) {
    console.error("Error in insertCamera:", error);
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
    let imageUrl = cameraData.image_url;

    if (imageFile) {
      const uploadResult = await uploadCameraImage(imageFile, cameraData.name);
      imageUrl = uploadResult.publicUrl;
    }

    const { error: cameraUpdateError } = await supabase
      .from("cameras")
      .update({
        name: cameraData.name.trim(),
        description: cameraData.description.trim(),
        image_url: imageUrl,
        available: Boolean(cameraData.available),
      })
      .eq("id", id);

    if (cameraUpdateError) throw cameraUpdateError;

    const { data: existingTiers, error: fetchTiersError } = await supabase
      .from("camera_pricing_tiers")
      .select("id, min_days, max_days")
      .eq("camera_id", id);

    if (fetchTiersError) throw fetchTiersError;

    const standardPrice = parseFloat(cameraData.pricePerDay) || 0;
    const discountedPrice = parseFloat(cameraData.discountedPricePerDay) || standardPrice;

    const tierUpdates = [];
    const standardTier = existingTiers.find(t => t.min_days === 1 && t.max_days === 3);
    const discountedTier = existingTiers.find(t => t.min_days === 4 && t.max_days === null);

    if (standardTier) {
      tierUpdates.push(
        supabase
          .from("camera_pricing_tiers")
          .update({ price_per_day: standardPrice })
          .eq("id", standardTier.id)
      );
    }

    if (discountedTier) {
      tierUpdates.push(
        supabase
          .from("camera_pricing_tiers")
          .update({ price_per_day: discountedPrice })
          .eq("id", discountedTier.id)
      );
    }

    if (tierUpdates.length > 0) {
      const tierResults = await Promise.all(tierUpdates);
      const tierError = tierResults.find(res => res.error);
      if (tierError) throw tierError.error;
    }

    return { success: true };
  } catch (error) {
    console.error("Error in updateCamera:", error);
    return { error };
  }
}

// Deletes a camera from the 'cameras' table and its associated image from storage.
export async function deleteCamera(id) {
  try {
    const { data: camera, error: fetchError } = await supabase
      .from("cameras")
      .select("image_url")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!camera) {
      console.warn(`Camera with ID ${id} not found for deletion.`);
      return { error: null };
    }

    const { error: deleteError } = await supabase
      .from("cameras")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    if (camera.image_url) {
      try {
        const urlParts = camera.image_url.split('/');
        const fileName = urlParts[urlParts.length - 1];

        if (fileName) {
          const { error: storageError } = await supabase
            .storage
            .from("cameras")
            .remove([fileName]);

          if (storageError) {
            console.error(`Failed to delete image ${fileName} from storage:`, storageError.message);
          } else {
            console.log(`Successfully deleted image ${fileName} from storage.`);
          }
        }
      } catch (storageUrlError) {
        console.error("Error parsing image URL for deletion:", storageUrlError);
      }
    }

    return { error: null };
  } catch (error) {
    console.error("Error in deleteCamera:", error);
    return { error };
  }
}

// --- Camera Pricing Tier Operations ---

export async function getCameraWithPricing(cameraId) {
  return await supabase
    .from("cameras")
    .select(`
      id,
      name,
      description,
      image_url,
      available,
      created_at,
      camera_pricing_tiers (
        id,
        camera_id,
        min_days,
        max_days,
        price_per_day,
        description
      )
    `)
    .eq("id", cameraId)
    .maybeSingle();
}

export async function getAllCamerasWithPricing() {
  return await supabase
    .from("cameras")
    .select(`
      id,
      name,
      description,
      image_url,
      available,
      created_at,
      camera_pricing_tiers (
        id,
        camera_id,
        min_days,
        max_days,
        price_per_day,
        description
      )
    `)
    .order("created_at", { ascending: false });
}

export async function getCameraPricingTiers(cameraId) {
  return await supabase
    .from("camera_pricing_tiers")
    .select("*")
    .eq("camera_id", cameraId)
    .order("min_days", { ascending: true });
}

export async function updateCameraPricingTiers(cameraId, tiersData) {
  try {
    const { data: existingTiers, error: fetchError } = await supabase
      .from("camera_pricing_tiers")
      .select("id")
      .eq("camera_id", cameraId);

    if (fetchError) throw fetchError;

    const existingTierIds = existingTiers.map(t => t.id);
    const providedTierIds = tiersData.map(t => t.id).filter(id => id);
    const tierIdsToDelete = existingTierIds.filter(id => !providedTierIds.includes(id));

    const upsertData = tiersData.map(tier => ({
      ...tier,
      camera_id: cameraId
    }));

    const { error: upsertError } = await supabase
      .from("camera_pricing_tiers")
      .upsert(upsertData, { onConflict: 'id' });

    if (upsertError) throw upsertError;

    if (tierIdsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("camera_pricing_tiers")
        .delete()
        .in("id", tierIdsToDelete);

      if (deleteError) throw deleteError;
    }

    return { success: true };
  } catch (error) {
    console.error("Error in updateCameraPricingTiers:", error);
    return { error };
  }
}
