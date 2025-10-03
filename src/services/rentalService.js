import { supabase } from '../lib/supabaseClient';
import { deleteAdminDocument } from './bookingService';
import { adminCreateInitialRentalPayment } from "./paymentService";

// Reusable query for fetching detailed rental information
const DETAILED_RENTAL_QUERY = `
  *,
  cameras (*, camera_inclusions (*, inclusion_items (*))),
  users!rentals_user_id_fkey (id, first_name, last_name, email, contact_number),
  payments (*)
`;

// ------------------------------------------
//    -- Functions --
// ------------------------------------------

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

    return { isAvailable, conflictingBookings: [] };
  } catch (error) {
    console.error("Error in checkCameraAvailability:", error);
    return { isAvailable: false, error: error.message || "Failed to check availability." };
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

// ------------------------------------------
//    -- User Functions --
// ------------------------------------------

// Create a rental request for a user
export async function createUserRentalRequest(bookingData) {
  try {
    const { cameraId, cameraModelName, startDate, endDate, contractPdfUrl, customerInfo } = bookingData;

    // simple validation
    if (!startDate || !endDate) throw new Error("Missing required fields: startDate and endDate are required.");
    if (!cameraId && !cameraModelName) throw new Error("Camera ID or model name required.");

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) throw new Error("End date must be after start date.");

    // get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Please log in first.");

    // smart allocation for least requested unit
    const finalCameraId = cameraId || await getAvailableUnitsOfModel(cameraModelName, startDate, endDate);

    // Price calculation
    const { totalPrice, pricePerDay, rentalDays } = await calculateTotalPrice(finalCameraId, startDate, endDate);

    // Insert rental
    const { data, error: insertError } = await supabase
      .from("rentals")
      .insert({
        user_id: user.id,
        camera_id: finalCameraId,
        start_date: startDate,
        end_date: endDate,
        total_price: totalPrice,
        price_per_day: pricePerDay,
        booking_type: "registered_user",
        rental_status: "pending",
        contract_pdf_url: contractPdfUrl,
        customer_name: customerInfo?.name || null,
        customer_contact: customerInfo?.contact || null,
        customer_email: customerInfo?.email || null
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return { success: true, data };
  } catch (err) {
    console.error("createUserRentalRequest error:", err);
    return { error: err.message || "Failed to create rental request." };
  }
}

// User cancels their own pending rental request
export async function userCancelRentalRequest(rentalId) {
  try {
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication error. Please log in.");
    }

    // First, verify that this rental belongs to the current user and is in pending status
    const { data: rental, error: fetchError } = await supabase
      .from('rentals')
      .select('id, rental_status, user_id')
      .eq('id', rentalId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      throw new Error("Rental not found or you don't have permission to cancel it.");
    }

    if (rental.rental_status !== 'pending') {
      throw new Error("Only pending rental requests can be cancelled.");
    }

    // Delete the rental request
    const { error: deleteError } = await supabase
      .from('rentals')
      .delete()
      .eq('id', rentalId)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;
    
    return { success: true, error: null };
  } catch (error) {
    console.error("Error in userCancelRentalRequest:", error);
    return { success: false, error: error.message || "Failed to cancel rental request." };
  }
}

// User cancels their own confirmed rental request (with restrictions)
export async function userCancelConfirmedRental(rentalId, cancellationReason) {
  try {
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication error. Please log in.");
    }

    // Get the rental with full details including shipping status
    const { data: rental, error: fetchError } = await supabase
      .from('rentals')
      .select('id, rental_status, shipping_status, user_id, start_date, end_date')
      .eq('id', rentalId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      throw new Error("Rental not found or you don't have permission to cancel it.");
    }

    if (rental.rental_status !== 'confirmed') {
      throw new Error("Only confirmed rental requests can be cancelled.");
    }

    // Check if camera is already in user's hands - prevent cancellation
    const cameraInUserHands = [
      'in_transit_to_user',
      'delivered', 
      'active',
      'return_scheduled',
      'in_transit_to_owner'
    ].includes(rental.shipping_status);

    if (cameraInUserHands) {
      let statusMessage = '';
      switch (rental.shipping_status) {
        case 'in_transit_to_user':
          statusMessage = 'The camera is currently being shipped to you';
          break;
        case 'delivered':
          statusMessage = 'The camera has been delivered to you';
          break;
        case 'active':
          statusMessage = 'Your rental period is currently active';
          break;
        case 'return_scheduled':
          statusMessage = 'The return process has already been initiated';
          break;
        case 'in_transit_to_owner':
          statusMessage = 'The camera is being returned to the owner';
          break;
        default:
          statusMessage = 'The camera is already in the delivery/rental process';
      }
      throw new Error(`Cannot cancel rental: ${statusMessage}. Please contact support for assistance.`);
    }

    // Update the rental status to cancelled with reason
    const { error: updateError } = await supabase
      .from('rentals')
      .update({
        rental_status: 'cancelled',
        cancellation_reason: cancellationReason,
      })
      .eq('id', rentalId)
      .eq('user_id', user.id);

    if (updateError) throw updateError;
    
    return { success: true, error: null };
  } catch (error) {
    console.error("Error in userCancelConfirmedRental:", error);
    return { success: false, error: error.message || "Failed to cancel confirmed rental." };
  }
}

// Update rental with contract PDF URL after background processing
export async function updateRentalContractUrl(rentalId, contractPdfUrl) {
  try {
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication error. Please log in.");
    }

    // Update the rental with the contract PDF URL
    const { data, error: updateError } = await supabase
      .from('rentals')
      .update({ contract_pdf_url: contractPdfUrl })
      .eq('id', rentalId)
      .eq('user_id', user.id) // Ensure user can only update their own rentals
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return { success: true, data, error: null };
  } catch (error) {
    console.error("Error in updateRentalContractUrl:", error);
    return { success: false, error: error.message || "Failed to update rental contract URL." };
  }
}

// ------------------------------------------
//   --  Admin Functions -- Generic
// ------------------------------------------

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
      .lte('start_date', endDate)
      .gte('end_date', startDate);

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

// Get an available camera unit for the model within date range
export async function getAvailableUnitsOfModel(cameraModelName, startDate, endDate) {
  try {
    const { data: cameraId, error } = await supabase.rpc('allocate_camera_unit', {
      p_camera_name: cameraModelName,
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) {
      console.error("Error allocating camera unit:", error);
      throw new Error("No available unit could be allocated for this model.");
    }

    return cameraId; // UUID of the selected camera unit
  } catch (err) {
    console.error("getAvailableUnitsOfModel error:", err);
    throw err;
  }
}

// Enhanced function to get camera by ID or name (for backward compatibility)
export async function getCameraInfo(cameraIdOrName) {
  try {
    let query = supabase
      .from('cameras')
      .select('id, name, serial_number, camera_status, description, image_url, cost, camera_condition');

    // Check if it's a UUID (camera ID) using proper regex
    if (typeof cameraIdOrName === 'string' && 
        cameraIdOrName.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // This is a UUID
      query = query.eq('id', cameraIdOrName);
    } else {
      // Treat as camera name
      query = query.eq('name', cameraIdOrName);
    }

    const { data, error } = await query.single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error getting camera info:", error);
    return { data: null, error: error.message || "Camera not found." };
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


// ------------------------------------------
//   --  Admin Functions -- 
// ------------------------------------------

// Admin confirms application (contract valid, ready for logistics)
export async function adminConfirmApplication(rentalId) {
  try {
    // Get the rental details
    const { data: rental, error: rentalError } = await getRentalById(rentalId);
    if (rentalError || !rental) {
      throw new Error("Rental not found.");
    }

    // Create initial rental payment
    const paymentResult = await adminCreateInitialRentalPayment(
      rentalId, 
      rental.user_id, 
      rental.total_price
    );

    if (!paymentResult.success) {
      throw new Error("Failed to create rental payment: " + paymentResult.error);
    }

    // Update rental status to confirmed
    const updateResult = await updateRentalStatus(rentalId, {
      rental_status: 'confirmed'
    });

    if (updateResult.error) {
      throw new Error("Failed to update rental status: " + updateResult.error);
    }

    return {
      success: true,
      data: {
        rental: updateResult.data,
        payment: paymentResult.data
      }
    };
  } catch (error) {
    console.error("Error in adminConfirmApplication:", error);
    return {
      success: false,
      error: error.message || "Failed to confirm application."
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
        conflictInfo: {
          conflictedUnit: {
            id: rental.camera_id,
            name: rental.cameras.name,
            serial_number: rental.cameras.serial_number
          },
          conflictCount: conflicts.length,
          confirmedConflicts: conflicts.filter(c => c.rental_status === 'confirmed').length,
          pendingConflicts: conflicts.filter(c => c.rental_status === 'pending').length,
          availableAlternatives: availableUnits ? availableUnits.length : 0
        },
        error: null
      };
    }

    // No conflicts, proceed with normal confirmation
    // Create initial rental payment
    const paymentResult = await adminCreateInitialRentalPayment(
      rentalId, 
      rental.user_id, 
      rental.total_price
    );

    if (!paymentResult.success) {
      throw new Error("Failed to create rental payment: " + paymentResult.error);
    }

    // Update rental status to confirmed
    const updateResult = await updateRentalStatus(rentalId, {
      rental_status: 'confirmed'
    });

    return {
      success: true,
      hasConflicts: false,
      conflicts: [],
      availableUnits: [],
      rental: updateResult.data,
      payment: paymentResult.data,
      error: updateResult.error
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

// Admin force deletes a rental and all related records (payments, extensions, and documents)
export async function adminForceDeleteRental(rentalId) {
  try {
    try {
      await deleteAdminDocument(rentalId, 'contract');
    } catch (error) {
      if (!error.message.includes('No contract found')) {
        console.warn(`Could not delete contract for rental ${rentalId}:`, error.message);
      }
    }
    
    try {
      await deleteAdminDocument(rentalId, 'receipt');
    } catch (error) {
      if (!error.message.includes('No payment receipt found')) {
        console.warn(`Could not delete receipt for rental ${rentalId}:`, error.message);
      }
    }

    // Delete database records
    await supabase.from('payments').delete().eq('rental_id', rentalId);
    await supabase.from('rental_extensions').delete().eq('rental_id', rentalId);
    
    const { error } = await supabase.from("rentals").delete().eq("id", rentalId);
    if (error) throw error;

    return { success: true, message: "Rental and related records deleted." };
  } catch (err) {
    console.error("adminForceDeleteRental error:", err);
    if (err.code === "23503") {
      return { success: false, error: "Delete blocked by existing dependencies." };
    }
    return { success: false, error: err.message || "Failed to delete rental." };
  }
}


// Admin removes a cancelled rental (frees up the dates)
export async function adminRemoveCancelledRental(rentalId) {
  try {
    const { data: rental, error: fetchError } = await supabase
      .from('rentals')
      .select('id, rental_status')
      .eq('id', rentalId)
      .single();

    if (fetchError) {
      throw new Error("Rental not found.");
    }

    if (rental.rental_status !== 'cancelled') {
      throw new Error("Only cancelled rentals can be removed.");
    }

    const { error: paymentDeleteError } = await supabase
      .from('payments')
      .delete()
      .eq('rental_id', rentalId);

    const { error: deleteError } = await supabase
      .from('rentals')
      .delete()
      .eq('id', rentalId);

    if (deleteError) throw deleteError;

    return { success: true, error: null, message: "Cancelled rental and associated payments removed successfully." };
  } catch (error) {
    console.error("Error in adminRemoveCancelledRental:", error);
    if (error.code === '23503') {
         return { success: false, error: "Cannot remove rental: Associated payment records exist and could not be deleted. Please try again or contact support." };
    }
    return { success: false, error: error.message || "Failed to remove cancelled rental." };
  }
}

// Helper function to redistribute existing conflicting rentals to available units
export async function adminRedistributeConflictingRentals(cameraModelName) {
  try {
    // Get all pending rentals for this camera model that might have conflicts
    const { data: pendingRentals, error: rentalsError } = await supabase
      .from('rentals')
      .select(DETAILED_RENTAL_QUERY)
      .eq('rental_status', 'pending')
      .eq('cameras.name', cameraModelName)
      .order('created_at', { ascending: true }); // First come, first served

    if (rentalsError) throw rentalsError;

    if (!pendingRentals || pendingRentals.length === 0) {
      return { success: true, message: "No pending rentals to redistribute.", redistributed: [] };
    }

    const redistributed = [];
    const errors = [];

    for (const rental of pendingRentals) {
      try {
        // Find an available unit for this rental
        const unitResult = await findAvailableCameraUnit(
          cameraModelName, 
          rental.start_date, 
          rental.end_date
        );

        if (unitResult.success && unitResult.cameraId !== rental.camera_id) {
          // Transfer to the available unit
          const transferResult = await transferRentalToUnit(rental.id, unitResult.cameraId);
          
          if (transferResult.success) {
            redistributed.push({
              rentalId: rental.id,
              customer: rental.customer_name || 'Unknown',
              fromUnit: rental.cameras?.serial_number || 'N/A',
              toUnit: unitResult.cameraUnit.serial_number || 'N/A'
            });
          } else {
            errors.push({
              rentalId: rental.id,
              customer: rental.customer_name || 'Unknown',
              error: transferResult.error
            });
          }
        }
      } catch (error) {
        errors.push({
          rentalId: rental.id,
          customer: rental.customer_name || 'Unknown',
          error: error.message
        });
      }
    }

    return {
      success: true,
      message: `Redistributed ${redistributed.length} rentals successfully.`,
      redistributed,
      errors
    };
  } catch (error) {
    console.error("Error in adminRedistributeConflictingRentals:", error);
    return {
      success: false,
      error: error.message || "Failed to redistribute conflicting rentals.",
      redistributed: [],
      errors: []
    };
  }
}