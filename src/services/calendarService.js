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


// Fetch rentals that overlap a given date range (inclusive) for all cameras
// statusFilter defaults to pending/confirmed/active to focus on actionable bookings
export async function getRentalsForDateRange(startDate, endDate, statusFilter = [
  'pending', 'confirmed', 'active'
]) {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .select(`
        id,
        camera_id,
        user_id,
        start_date,
        end_date,
        rental_status,
        total_price,
        price_per_day,
        created_at,
        cameras ( id, name, image_url ),
        users!rentals_user_id_fkey ( id, first_name, last_name, email, contact_number )
      `)
      .in('rental_status', statusFilter)
      .lte('start_date', endDate)
      .gte('end_date', startDate)
      .order('start_date', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error in getRentalsForDateRange:', error);
    return { data: null, error: error.message || 'Failed to fetch rentals.' };
  }
}

// Utility to group rentals by camera_id for quick lookup
export function groupRentalsByCamera(rentals = []) {
  return rentals.reduce((acc, rental) => {
    const key = rental.camera_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(rental);
    return acc;
  }, {});
}

// Recommendation: create indexes in Supabase for faster calendar queries
// Suggested (run in Supabase SQL editor):
// CREATE INDEX IF NOT EXISTS rentals_camera_id_idx ON rentals(camera_id);
// CREATE INDEX IF NOT EXISTS rentals_start_date_idx ON rentals(start_date);
// CREATE INDEX IF NOT EXISTS rentals_end_date_idx ON rentals(end_date);
// CREATE INDEX IF NOT EXISTS rentals_status_idx ON rentals(rental_status);
// CREATE INDEX IF NOT EXISTS rentals_camera_date_idx ON rentals(camera_id, start_date, end_date);
