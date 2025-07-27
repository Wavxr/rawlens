// services/inclusionService.js
// ===================================================================
// CRUD helpers for the "inclusion_items" and "camera_inclusions" features.
// ===================================================================

import { supabase } from "../lib/supabaseClient";

// Fetches all inclusion items, ordered by name.
export async function getAllInclusionItems() {
  return await supabase
    .from("inclusion_items")
    .select("*")
    .order("name", { ascending: true });
}

// Fetches a single inclusion item by its ID.
export async function getInclusionItemById(id) {
  return await supabase
    .from("inclusion_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
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

// Updated getInclusionsForCamera in inclusionService.js
export async function getInclusionsForCamera(cameraId) {
  if (!cameraId) {
    console.warn("getInclusionsForCamera called with null/undefined cameraId");
    return { data: [], error: null };
  }

  try {
    // Select both inclusion_item_id and quantity
    const { data, error } = await supabase
      .from("camera_inclusions")
      .select("inclusion_item_id, quantity") // <-- Changed to include quantity
      .eq("camera_id", cameraId);

    if (error) {
      console.error(`Supabase error fetching inclusions for camera ${cameraId}:`, error);
      return { data: null, error };
    }

    // Return the full objects (no need to map just IDs anymore)
    return { data: data || [], error: null }; // <-- Return full data array

  } catch (err) {
    console.error(`Unexpected error in getInclusionsForCamera for camera ${cameraId}:`, err);
    return { data: null, error: err };
  }
}


// Updated signature and implementation
export async function updateCameraInclusions(cameraId, inclusionDataWithQuantities) {
  // inclusionDataWithQuantities is expected to be an array like:
  // [{ inclusion_item_id: 'uuid-1', quantity: 2 }, { inclusion_item_id: 'uuid-2', quantity: 1 }]
  
  try {
    // 1. Fetch existing inclusion associations for this camera
    const { data: existingLinks, error: fetchError } = await supabase
      .from("camera_inclusions")
      .select("inclusion_item_id, quantity")
      .eq("camera_id", cameraId);

    if (fetchError) throw fetchError;

    // Create a map of existing items for easy lookup
    const existingMap = new Map(existingLinks.map(link => [link.inclusion_item_id, link.quantity]));
    
    // Create a map of provided items for easy lookup
    const providedMap = new Map(inclusionDataWithQuantities.map(item => [item.inclusion_item_id, item.quantity]));

    // 2. Determine links to add or update
    const linksToUpsert = inclusionDataWithQuantities.map(item => ({
      camera_id: cameraId,
      inclusion_item_id: item.inclusion_item_id,
      quantity: item.quantity
    }));

    // 3. Determine links to remove (in existing but not provided)
    const itemIdsToRemove = existingLinks
      .map(link => link.inclusion_item_id)
      .filter(id => !providedMap.has(id));

    // 4. Perform database operations
    const operations = [];

    // a. Upsert all provided links (this will insert new ones or update existing ones)
    if (linksToUpsert.length > 0) {
      operations.push(supabase.from("camera_inclusions").upsert(linksToUpsert, { onConflict: 'camera_id,inclusion_item_id' }));
    }

    // b. Delete removed links
    if (itemIdsToRemove.length > 0) {
      operations.push(
        supabase
          .from("camera_inclusions")
          .delete()
          .eq("camera_id", cameraId)
          .in("inclusion_item_id", itemIdsToRemove)
      );
    }

    // Execute operations concurrently
    if (operations.length > 0) {
      const results = await Promise.all(operations);
      // Check for errors in any of the operations
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
// Useful for displaying camera details with included items on the user side.
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

// Future enhancements could include:
// - getCamerasByInclusionItemId(inclusionItemId): Find all cameras that include a specific item.
// - Bulk operations for inclusion items if needed.