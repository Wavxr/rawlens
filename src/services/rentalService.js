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

  const pricePerDay = applicableTier.price_per_day;
  const totalPrice = rentalDays * pricePerDay;

  return { totalPrice, pricePerDay, rentalDays };
}


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
      conflictingBookings: []
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
    const { totalPrice, pricePerDay, rentalDays } = await calculateTotalPrice(cameraId, startDate, endDate);

    // --- DATABASE INSERTION ---
    const { data, error: insertError } = await supabase
      .from('rentals')
      .insert({
        user_id: user.id,
        camera_id: cameraId,
        start_date: startDate,
        end_date: endDate,
        total_price: totalPrice,
        price_per_day: pricePerDay,
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

    if (error) {
      throw error;
    }
    
    return { success: true, data: data[0] };
  } catch (error) {
    return { 
      error: error.message || "Failed to update rental status.",
      code: error.code,
      details: error.details
    };
  }
}

// --- Simplified Workflow Functions using single rental_status ---
export async function getRentalsByStatus(status = null) {
  try {
    let query = supabase.from('rentals').select(DETAILED_RENTAL_QUERY);

    // Filter by rental status if provided
    if (status) {
      query = query.eq('rental_status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    // Filter out temporary bookings with pending status
    const filteredData = data.filter(rental =>
      !(rental.booking_type === 'temporary' && rental.rental_status === 'pending')
    );

    return { data: filteredData, error: null };
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

// Find conflicting rentals for the same camera unit and overlapping dates
export async function findConflictingRentals(cameraId, startDate, endDate, excludeRentalId = null) {
  try {
    let query = supabase
      .from('rentals')
      .select(`
        id,
        camera_id,
        start_date,
        end_date,
        rental_status,
        customer_name,
        cameras (name, serial_number),
        users!rentals_user_id_fkey (first_name, last_name, email)
      `)
      .eq('camera_id', cameraId)
      .in('rental_status', ['pending', 'confirmed', 'active'])
      .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

    if (excludeRentalId) {
      query = query.neq('id', excludeRentalId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    console.error("Error finding conflicting rentals:", error);
    return { data: null, error: error.message || "Failed to find conflicting rentals." };
  }
}

// Get available units of the same camera model for given dates
export async function getAvailableUnitsOfModel(cameraModelName, startDate, endDate, excludeRentalId = null) {
  try {
    // First get all units of this model
    const { data: allUnits, error: cameraError } = await supabase
      .from('cameras')
      .select('id, name, serial_number, camera_status')
      .eq('name', cameraModelName)
      .neq('camera_status', 'unavailable')
      .order('serial_number', { ascending: true });

    if (cameraError) throw cameraError;

    if (!allUnits || allUnits.length === 0) {
      return { data: [], error: null };
    }

    // Check availability for each unit
    const availableUnits = [];
    for (const unit of allUnits) {
      const { isAvailable } = await checkCameraAvailability(unit.id, startDate, endDate);
      
      // If there's an exclude rental ID, check if this unit would be available if we exclude that rental
      if (!isAvailable && excludeRentalId) {
        const { data: conflicts } = await findConflictingRentals(unit.id, startDate, endDate, excludeRentalId);
        if (conflicts && conflicts.length === 0) {
          availableUnits.push(unit);
        }
      } else if (isAvailable) {
        availableUnits.push(unit);
      }
    }

    return { data: availableUnits, error: null };
  } catch (error) {
    console.error("Error getting available units of model:", error);
    return { data: null, error: error.message || "Failed to get available units." };
  }
}

// Transfer a rental to a different camera unit (same model)
export async function transferRentalToUnit(rentalId, newCameraId) {
  try {
    // Get the rental details first
    const { data: rental, error: rentalError } = await getRentalById(rentalId);
    if (rentalError || !rental) {
      throw new Error("Rental not found.");
    }

    // Verify the new camera is the same model
    const { data: newCamera, error: cameraError } = await supabase
      .from('cameras')
      .select('name, serial_number')
      .eq('id', newCameraId)
      .single();

    if (cameraError || !newCamera) {
      throw new Error("Target camera not found.");
    }

    if (newCamera.name !== rental.cameras.name) {
      throw new Error("Can only transfer to the same camera model.");
    }

    // Check if the new unit is available for the rental dates
    const { isAvailable } = await checkCameraAvailability(newCameraId, rental.start_date, rental.end_date);
    if (!isAvailable) {
      throw new Error("Target camera unit is not available for the selected dates.");
    }

    // Update the rental to use the new camera unit
    const { error: updateError } = await supabase
      .from('rentals')
      .update({ camera_id: newCameraId })
      .eq('id', rentalId);

    if (updateError) throw updateError;

    return { 
      success: true, 
      message: `Rental transferred to ${newCamera.name} (Serial: ${newCamera.serial_number})`,
      error: null 
    };
  } catch (error) {
    console.error("Error transferring rental:", error);
    return { 
      success: false, 
      error: error.message || "Failed to transfer rental to new unit.",
      message: null 
    };
  }
}

// Enhanced admin confirm with conflict detection and resolution
export async function adminConfirmApplicationWithConflictCheck(rentalId) {
  try {
    // Get the rental details
    const { data: rental, error: rentalError } = await getRentalById(rentalId);
    if (rentalError || !rental) {
      throw new Error("Rental not found.");
    }

    // Check for conflicts
    const { data: conflicts, error: conflictError } = await findConflictingRentals(
      rental.camera_id,
      rental.start_date,
      rental.end_date,
      rentalId
    );

    if (conflictError) {
      throw new Error(conflictError);
    }

    // If there are conflicts, try to find an alternative unit
    if (conflicts && conflicts.length > 0) {
      const { data: availableUnits } = await getAvailableUnitsOfModel(
        rental.cameras.name,
        rental.start_date,
        rental.end_date
      );

      return {
        success: false,
        hasConflicts: true,
        conflicts: conflicts,
        availableUnits: availableUnits || [],
        rental: rental,
        error: null
      };
    }

    // No conflicts, proceed with normal confirmation
    const result = await updateRentalStatus(rentalId, {
      rental_status: 'confirmed'
    });

    return {
      success: true,
      hasConflicts: false,
      conflicts: [],
      availableUnits: [],
      rental: rental,
      error: result.error
    };
  } catch (error) {
    console.error("Error in adminConfirmApplicationWithConflictCheck:", error);
    return {
      success: false,
      hasConflicts: false,
      conflicts: [],
      availableUnits: [],
      rental: null,
      error: error.message || "Failed to confirm application with conflict check."
    };
  }
}

// Admin rejects application (contract becomes void)
export async function adminRejectApplication(rentalId, rejectionReason = null) {
  const updateData = {
    rental_status: 'rejected'
  };
  
  // If rejection reason is provided, store it
  if (rejectionReason) {
    updateData.rejection_reason = rejectionReason;
  }
  
  return await updateRentalStatus(rentalId, updateData);
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

// Reusable query for fetching detailed rental information
const DETAILED_RENTAL_QUERY = `
  *,
  cameras (*, camera_inclusions (*, inclusion_items (*))),
  users!rentals_user_id_fkey (id, first_name, last_name, email, contact_number)
`;

// Get a single rental by its ID with all details
export async function getRentalById(rentalId) {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .select(DETAILED_RENTAL_QUERY)
      .eq('id', rentalId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error(`Error fetching rental ${rentalId}:`, error);
    return { data: null, error: error.message || "Failed to fetch rental." };
  }
}

// Get user's rental
export async function getUserRentals(userId) {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .select(DETAILED_RENTAL_QUERY)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error in getUserRentals:", error);
    return { data: null, error: error.message || "Failed to fetch user rentals." };
  }
}