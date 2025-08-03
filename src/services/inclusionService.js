import { supabase } from "../lib/supabaseClient";

export async function getAllInclusionItems() {
  return await supabase
    .from("inclusion_items")
    .select("*")
    .order("name", { ascending: true });
}

// Creates a new inclusion item.
export async function createInclusionItem(inclusionData) {
  try {
    const { data, error } = await supabase
      .from("inclusion_items")
      .insert({
        name: inclusionData.name.trim(),
      })
      .select();

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error("Error in createInclusionItem:", error);
    return { error };
  }
}

// Updates an existing inclusion item.
export async function updateInclusionItem(id, inclusionData) {
  try {
    const updatePayload = {};
    if (inclusionData.name !== undefined) {
        updatePayload.name = inclusionData.name.trim();
    }

    const { data, error } = await supabase
      .from("inclusion_items")
      .update(updatePayload)
      .eq("id", id)
      .select();

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error("Error in updateInclusionItem:", error);
    return { error };
  }
}

// Deletes an inclusion item.
export async function deleteInclusionItem(id) {
  try {
    const { error } = await supabase
      .from("inclusion_items")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error in deleteInclusionItem:", error);
    return { error };
  }
}

// --- Camera-Inclusion Association Management ---

// Fetches inclusion items associated with a specific camera, including quantities.
export async function getInclusionsForCamera(cameraId) {
  if (!cameraId) {
    console.warn("getInclusionsForCamera called with null/undefined cameraId");
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from("camera_inclusions")
      .select("inclusion_item_id, quantity")
      .eq("camera_id", cameraId);

    if (error) {
      console.error(`Supabase error fetching inclusions for camera ${cameraId}:`, error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error(`Unexpected error in getInclusionsForCamera for camera ${cameraId}:`, err);
    return { data: null, error: err };
  }
}

// Updates the inclusion items associated with a specific camera, including quantities.
export async function updateCameraInclusions(cameraId, inclusionDataWithQuantities) {
  try {
    const { data: existingLinks, error: fetchError } = await supabase
      .from("camera_inclusions")
      .select("inclusion_item_id")
      .eq("camera_id", cameraId);

    if (fetchError) throw fetchError;

    const existingMap = new Map(existingLinks.map(link => [link.inclusion_item_id, true]));
    const providedMap = new Map(inclusionDataWithQuantities.map(item => [item.inclusion_item_id, true]));

    const linksToUpsert = inclusionDataWithQuantities.map(item => ({
      camera_id: cameraId,
      inclusion_item_id: item.inclusion_item_id,
      quantity: item.quantity
    }));

    const itemIdsToRemove = existingLinks
      .map(link => link.inclusion_item_id)
      .filter(id => !providedMap.has(id));

    const operations = [];

    if (linksToUpsert.length > 0) {
      operations.push(supabase.from("camera_inclusions").upsert(linksToUpsert, { onConflict: 'camera_id,inclusion_item_id' }));
    }

    if (itemIdsToRemove.length > 0) {
      operations.push(
        supabase
          .from("camera_inclusions")
          .delete()
          .eq("camera_id", cameraId)
          .in("inclusion_item_id", itemIdsToRemove)
      );
    }

    if (operations.length > 0) {
      const results = await Promise.all(operations);
      const opError = results.find(res => res.error);
      if (opError) throw opError.error;
    }

    return { success: true };
  } catch (error) {
    console.error("Error in updateCameraInclusions:", error);
    return { error };
  }
}

// Fetches a single camera along with its associated inclusion items (full details).
export async function getCameraWithInclusions(cameraId) {
    return await supabase
      .from("cameras")
      .select(`
        id,
        name,
        description,
        image_url,
        available,
        created_at,
        camera_inclusions (
          quantity,
          inclusion_item_id,
          inclusion_items (
            id,
            name
          )
        )
      `)
      .eq("id", cameraId)
      .maybeSingle();
}