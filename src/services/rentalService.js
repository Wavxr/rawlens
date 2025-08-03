import { supabase } from "../lib/supabaseClient";

// Calculates the number of rental days between two dates.
function calculateRentalDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  const daysDiff = timeDiff / (1000 * 3600 * 24);
  return Math.ceil(daysDiff);
}

// Calculates the total price for a rental based on the camera's pricing tiers.
async function calculateTotalPrice(cameraId, startDate, endDate) {
  const rentalDays = calculateRentalDays(startDate, endDate);
  if (rentalDays <= 0) {
    throw new Error("Invalid rental period: End date must be after start date.");
  }

  const { data: tiers, error } = await supabase
    .from('camera_pricing_tiers')
    .select('min_days, max_days, price_per_day')
    .eq('camera_id', cameraId)
    .order('min_days', { ascending: true });

  if (error) {
    console.error("Error fetching pricing tiers from Supabase:", error);
    throw new Error("Failed to fetch camera pricing information.");
  }

  if (!tiers || tiers.length === 0) {
    throw new Error(`No pricing tiers found for camera ID ${cameraId}.`);
  }

  const applicableTier = tiers.find(tier =>
    rentalDays >= tier.min_days && (tier.max_days === null || rentalDays <= tier.max_days)
  );

  if (!applicableTier) {
    throw new Error(`No pricing tier found for a rental of ${rentalDays} days for camera ID ${cameraId}.`);
  }

  return rentalDays * applicableTier.price_per_day;
}

// Check if a specific camera is available for a given date range.
export async function checkCameraAvailability(cameraId, startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .select('id, start_date, end_date, application_status')
      .eq('camera_id', cameraId)
      .in('application_status', ['confirmed', 'active'])
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

// Allows a registered user to initiate a rental request.
export async function createUserRentalRequest(bookingData) {
  try {
    const { cameraId, startDate, endDate } = bookingData;

    if (!startDate || !endDate) {
      throw new Error("Start date and end date are required.");
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      throw new Error("End date must be after start date.");
    }

    const isAvailableResult = await checkCameraAvailability(cameraId, startDate, endDate);
    if (!isAvailableResult.isAvailable) {
      throw new Error("Selected camera is not available for the chosen dates.");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication error. Please log in.");
    }

    const totalPrice = await calculateTotalPrice(cameraId, startDate, endDate);

    const { data, error: insertError } = await supabase
      .from('rentals')
      .insert({
        user_id: user.id,
        camera_id: cameraId,
        start_date: startDate,
        end_date: endDate,
        total_price: totalPrice,
        booking_type: 'registered_user',
        application_status: 'pending'
      })
      .select();

    if (insertError) throw insertError;

    return { success: true, data: data[0] };
  } catch (error) {
    console.error("Error in createUserRentalRequest:", error);
    return { error: error.message || "Failed to create rental request." };
  }
}