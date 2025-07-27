// services/cameraService.js
// ===================================================================
// CRUD helpers for the "cameras" and "camera_pricing_tiers" features.
// ===================================================================

import { supabase } from "../lib/supabaseClient";

// --- Private Helper Functions ---
const generateFileName = (cameraName) => `${cameraName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.jpg`;

//Uploads a camera image file to the Supabase Storage bucket.
async function uploadCameraImage(file, cameraName) {
  if (!file) return { key: null, publicUrl: null };

  const fileName = generateFileName(cameraName);

  // 1. Upload the file to the 'cameras' storage bucket
  const { error: uploadError } = await supabase.storage
    .from("cameras")
    .upload(fileName, file, { upsert: false });

  if (uploadError) {
    console.error("Image upload error:", uploadError);
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  // 2. Get the public URL for the uploaded file
  // Assumes the 'cameras' bucket is configured to allow public access for objects.
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

//Inserts a new camera into the 'cameras' table and creates its initial pricing tiers.
export async function insertCamera(cameraData, imageFile) {
  let imageUrl = null;

  try {
    // 1. Upload the camera image
    const uploadResult = await uploadCameraImage(imageFile, cameraData.name);
    imageUrl = uploadResult.publicUrl;

    // 2. Insert the main camera record into the 'cameras' table
    const { data: cameraInsertData, error: cameraInsertError } = await supabase
      .from("cameras")
      .insert({
        name: cameraData.name.trim(),
        description: cameraData.description.trim(),
        image_url: imageUrl,
        available: true,
      })
      .select(); // Select the inserted data to get the new camera's ID

    if (cameraInsertError) throw cameraInsertError;

    const newCameraId = cameraInsertData[0]?.id;
    if (!newCameraId) {
      throw new Error("Failed to retrieve ID of the newly created camera.");
    }

    // 3. Create initial pricing tiers for the new camera
    const standardPrice = parseFloat(cameraData.pricePerDay) || 0;
    const discountedPrice = parseFloat(cameraData.discountedPricePerDay) || standardPrice;

    // if want to change min_days and max_days, make sure to create a new input with admin/cameras.jsx
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

//Fetches all cameras from the 'cameras' table.
export async function getAllCameras() {
  // Fetches cameras ordered by creation date (newest first)
  return await supabase
    .from("cameras")
    .select("*")
    .order("created_at", { ascending: false });
}

//Updates an existing camera's details and its associated pricing tiers.
export async function updateCamera(id, cameraData, imageFile = null) {
  try {
    let imageUrl = cameraData.image_url;

    // 1. Handle image update if a new file is provided
    if (imageFile) {
      const uploadResult = await uploadCameraImage(imageFile, cameraData.name);
      imageUrl = uploadResult.publicUrl;
    }

    // 2. Update the main camera record in the 'cameras' table
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

    // 3. Update the associated pricing tiers
    // Fetch current tiers to get their IDs for update
    const { data: existingTiers, error: fetchTiersError } = await supabase
      .from("camera_pricing_tiers")
      .select("id, min_days, max_days")
      .eq("camera_id", id);

    if (fetchTiersError) throw fetchTiersError;

    const standardPrice = parseFloat(cameraData.pricePerDay) || 0;
    const discountedPrice = parseFloat(cameraData.discountedPricePerDay) || standardPrice;

    // Prepare updates for existing tiers
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

    // Execute tier updates concurrently
    if (tierUpdates.length > 0) {
        const tierResults = await Promise.all(tierUpdates);
        // Check for errors in any of the tier updates
        const tierError = tierResults.find(res => res.error);
        if (tierError) throw tierError.error;
    }
    // TODO: Handle case where tiers don't exist (e.g., insert them if missing)
    // This could happen if tiers were manually deleted from the DB.

    return { success: true };
  } catch (error) {
    console.error("Error in updateCamera:", error);
    return { error };
  }
}

//Deletes a camera from the 'cameras' table.
export async function deleteCamera(id) {
  const { error } = await supabase.from("cameras").delete().eq("id", id);
  return { error };
}

// --- Camera Pricing Tier Operations ---

// Fetches a single camera along with its associated pricing tiers.
// Useful for displaying detailed camera information with dynamic pricing on the user side (e.g., rent.jsx).
export async function getCameraWithPricing(cameraId) {
  // Joins 'cameras' with 'camera_pricing_tiers' to get all data in one call.
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
    .maybeSingle(); // Use maybeSingle if the camera might not exist
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


// Fetches only the pricing tiers for a specific camera.
// Useful for the admin panel to display and edit pricing tiers.
export async function getCameraPricingTiers(cameraId) {
  return await supabase
    .from("camera_pricing_tiers")
    .select("*")
    .eq("camera_id", cameraId)
    .order("min_days", { ascending: true }); // Order tiers logically
}




// Updates the pricing tiers for a specific camera.
// This function replaces the existing tiers for the camera with the provided data.
export async function updateCameraPricingTiers(cameraId, tiersData) {
  try {
    // 1. Fetch existing tier IDs for this camera
    const { data: existingTiers, error: fetchError } = await supabase
      .from("camera_pricing_tiers")
      .select("id")
      .eq("camera_id", cameraId);

    if (fetchError) throw fetchError;

    const existingTierIds = existingTiers.map(t => t.id);
    const providedTierIds = tiersData.map(t => t.id).filter(id => id); // Filter out undefined/null IDs

    // 2. Determine tiers to delete (existing but not in provided data)
    const tierIdsToDelete = existingTierIds.filter(id => !providedTierIds.includes(id));

    // 3. Prepare upsert data (add camera_id and ensure IDs are present for updates)
    const upsertData = tiersData.map(tier => ({
      ...tier,
      camera_id: cameraId // Ensure camera_id is set
    }));

    // 4. Perform upsert (insert or update)
    const { error: upsertError } = await supabase
      .from("camera_pricing_tiers")
      .upsert(upsertData, { onConflict: 'id' }); // Specify conflict resolution on 'id'

    if (upsertError) throw upsertError;

    // 5. Delete tiers that are no longer present
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

// --- Future: Camera Inclusion Operations ---
// Functions like getCameraInclusions, updateCameraInclusions can be added here
// following a similar pattern to pricing tiers.