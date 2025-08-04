import { supabase } from "../lib/supabaseClient";

// Check if a specific camera is available for a given date range.
export async function checkCameraAvailability(cameraId, startDate, endDate) {
  try {
    // Check against confirmed rentals (not pending or rejected)
    const { data, error } = await supabase
      .from('rentals')
      .select('id, start_date, end_date, rental_status')
      .eq('camera_id', cameraId)
      .in('rental_status', ['confirmed', 'active'])
      .lt('start_date', endDate)
      .gt('end_date', startDate);

    if (error) {
      console.error("Availability check error:", error);
      throw error;
    }

    const isAvailable = data.length === 0;
    return {
      isAvailable,
      conflictingBookings: isAvailable ? [] : data
    };
  } catch (error) {
    console.error("Error in checkCameraAvailability:", error);
    return { isAvailable: false, error: error.message || "Failed to check availability." };
  }
}

// Find all cameras available for a specific date range.
export async function getAvailableCamerasForDates(startDate, endDate) {
  try {
    // 1. Get all available cameras
    const { data: allCameras, error: cameraError } = await supabase
      .from('cameras')
      .select('id, name, image_url, description')
      .eq('available', true);

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

