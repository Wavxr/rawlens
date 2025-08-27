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

// --- Camera Availability Functions ---

// Check if a specific camera is available for a given date range.
export async function checkCameraAvailability(cameraId, startDate, endDate) {
  try {
    // Prefer secure RPC that runs with SECURITY DEFINER and returns only a boolean
    const { data: isAvailable, error } = await supabase.rpc('check_camera_availability', {
      p_camera_id: cameraId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_block_statuses: ['confirmed', 'active'],
    });

    if (error) {
      console.error("Availability check error (RPC):", error);
      throw error;
    }

    return {
      isAvailable,
      conflictingBookings: [] // RPC does not expose bookings to the client
    };
  } catch (error) {
    console.error("Error in checkCameraAvailability:", error);
    return { isAvailable: false, error: error.message || "Failed to check availability." };
  }
}

// Find all cameras available for a specific date range.
export async function getAvailableCamerasForDates(startDate, endDate) {
  try {
    // 1. Get all cameras that are not marked as unavailable
    const { data: allCameras, error: cameraError } = await supabase
      .from('cameras')
      .select('id, name, image_url, description, camera_status')
      .neq('camera_status', 'unavailable');

    if (cameraError) throw cameraError;

    // 2. Check availability for each camera
    const availabilityChecks = allCameras.map(async (camera) => {
      const { isAvailable } = await checkCameraAvailability(camera.id, startDate, endDate);
      return {
        ...camera,
        isAvailable
      };
    });

    const camerasWithAvailability = await Promise.all(availabilityChecks);
    return { data: camerasWithAvailability, error: null };
  } catch (error) {
    console.error("Error in getAvailableCamerasForDates:", error);
    return { data: null, error: error.message || "Failed to fetch available cameras." };
  }
}