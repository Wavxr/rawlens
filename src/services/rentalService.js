import { supabase } from "../lib/supabaseClient";

export function calculateRentalDays(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const timeDiff = end.getTime() - start.getTime();

  if (timeDiff < 0) {
    throw new Error("Invalid rental period: End date is before start date.");
  }
  return Math.floor(timeDiff / (1000 * 3600 * 24)) + 1;
}

export async function calculateTotalPrice(cameraId, startDate, endDate) {
  const rentalDays = calculateRentalDays(startDate, endDate);

  const { data: tiers, error } = await supabase
    .from('camera_pricing_tiers')
    .select('min_days, max_days, price_per_day')
    .eq('camera_id', cameraId)
    .order('min_days', { ascending: true });

  if (error) {
    console.error("Error fetching pricing tiers from Supabase:", error); // Good for debugging
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

  const totalPrice = rentalDays * applicableTier.price_per_day;

  return totalPrice;
}


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

// Allows a registered user to initiate a rental request with contract
export async function createUserRentalRequest(bookingData) {
  try {
    const { cameraId, startDate, endDate, contractPdfUrl, customerInfo } = bookingData;

    // --- VALIDATION ---
    // Ensure start date, end date, and the contract FILE PATH are provided
    if (!startDate || !endDate || !contractPdfUrl) {
      throw new Error("Start date, end date, and contract file path are required.");
    }
    
    const start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
    const end = new Date(new Date(endDate).setHours(0, 0, 0, 0));

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      throw new Error("Please select valid dates. End date must be on or after start date.");
    }

    // --- AVAILABILITY CHECK ---
    const isAvailableResult = await checkCameraAvailability(cameraId, startDate, endDate);
    if (!isAvailableResult.isAvailable) {
      throw new Error("Selected camera is not available for the chosen dates.");
    }

    // --- USER AUTHENTICATION ---
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication error. Please log in.");
    }

    // --- PRICE CALCULATION ---
    const totalPrice = await calculateTotalPrice(cameraId, startDate, endDate);

    // --- DATABASE INSERTION ---
    const { data, error: insertError } = await supabase
      .from('rentals')
      .insert({
        user_id: user.id,
        camera_id: cameraId,
        start_date: startDate,
        end_date: endDate,
        total_price: totalPrice,
        booking_type: 'registered_user',
        rental_status: 'pending',
        contract_pdf_url: contractPdfUrl, 
        customer_name: customerInfo?.name || null,
        customer_contact: customerInfo?.contact || null,
        customer_email: customerInfo?.email || null
      })
      .select(); 

    if (insertError) {
        console.error("Supabase insert error:", insertError);
        throw insertError;
    }

    // Return success and the newly created rental data
    return { success: true, data: data[0] };
  } catch (error) {
    console.error("Error in createUserRentalRequest:", error);
    // Return a user-friendly error message
    return { error: error.message || "Failed to create rental request. Please try again." };
  }
}

// Generic function to update rental status
export async function updateRentalStatus(rentalId, statusUpdates) {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .update(statusUpdates)
      .eq('id', rentalId)
      .select(); 

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error("Error in updateRentalStatus:", error);
    return { error: error.message || "Failed to update rental status." };
  }
}

// --- Simplified Workflow Functions using single rental_status ---
export async function getRentalsByStatus(status = null) {
  try {
    let query = supabase.from('rentals').select(`
        *,
        cameras (id, name, image_url),
        users!rentals_user_id_fkey (id, first_name, last_name, email, contact_number)
      `);

    // Filter by rental status if provided
    if (status) {
      query = query.eq('rental_status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error("Error in getRentalsByStatus:", error);
    return { data: null, error: error.message || "Failed to fetch rentals by status." };
  }
}

// Get pending applications for admin review
export async function getPendingApplications() {
  return await getRentalsByStatus('pending');
}

// Get rejected applications
export async function getRejectedApplications() {
  return await getRentalsByStatus('rejected');
}

// Get confirmed rentals
export async function getConfirmedRentals() {
  return await getRentalsByStatus('confirmed');
}

// ------------------------------------------
//   --  Admin Status Management Functions --
// ------------------------------------------

// Admin confirms application (contract valid, ready for logistics)
export async function adminConfirmApplication(rentalId) {
  return await updateRentalStatus(rentalId, {
    rental_status: 'confirmed'
  });
}

// Admin rejects application (contract becomes void)
export async function adminRejectApplication(rentalId) {
  return await updateRentalStatus(rentalId, {
    rental_status: 'rejected'
  });
}

// Admin marks rental as active (camera in use by customer)
export async function adminStartRental(rentalId) {
  return await updateRentalStatus(rentalId, {
    rental_status: 'active'
  });
}

// Admin marks rental as completed (camera returned)
export async function adminCompleteRental(rentalId) {
  return await updateRentalStatus(rentalId, {
    rental_status: 'completed',
    completed_at: new Date().toISOString()
  });
}

// Admin cancels rental at any point
export async function adminCancelRental(rentalId) {
  return await updateRentalStatus(rentalId, {
    rental_status: 'cancelled'
  });
}

// Update shipping status
export async function updateShippingStatus(rentalId, shippingStatus, timestampField = null) {
  const updates = {
    shipping_status: shippingStatus
  };
  
  if (timestampField) {
    updates[timestampField] = new Date().toISOString();
  }
  
  return await updateRentalStatus(rentalId, updates);
}

// Admin deletes a rental record row entirely
export async function adminDeleteRental(rentalId) {
  try {
    const { error } = await supabase
      .from('rentals')
      .delete()
      .eq('id', rentalId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error("Error in adminDeleteRental:", error);
    return { success: false, error: error.message || "Failed to delete rental." };
  }
}

// Get user's rental
export async function getUserRentals(userId) {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .select(`
        *,
        cameras (id, name, description, image_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error in getUserRentals:", error);
    return { data: null, error: error.message || "Failed to fetch user rentals." };
  }
}