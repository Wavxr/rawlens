// extensionService.js
import { supabase } from "../lib/supabaseClient";
import { adminCreateExtensionPayment } from "./paymentService"; // Import the payment creation function
import { checkCameraAvailability } from "./rentalService";

// ------------------------------------------
//   --  Generic Functions --
// ------------------------------------------

// Get rental extension details by ID
export async function getExtensionById(extensionId) {
  try {
    const { data, error } = await supabase
      .from('rental_extensions')
      .select(`
        *,
        rental:rentals(
          *,
          camera:cameras(*),
          user:users(*)
        ),
        requested_by_user:users!requested_by(*)
      `)
      .eq('id', extensionId)
      .single();
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

// Checks if the camera associated with a rental is available for an extension period.
// Checks availability from the day *after* the current rental end date.
export async function checkCameraAvailabilityForExtension(rentalId, newEndDate) {
  try {
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .select("end_date, camera_id")
      .eq("id", rentalId)
      .single();

    if (rentalError || !rental) {
      return { isAvailable: false, error: "Rental not found." };
    }

    const currentEnd = new Date(rental.end_date);
    const newEnd = new Date(newEndDate);
    currentEnd.setHours(0, 0, 0, 0);
    newEnd.setHours(0, 0, 0, 0);

    if (newEnd <= currentEnd) {
      return { isAvailable: false, error: "New end date must be after current end date." };
    }

    // Check for conflicting rentals for the extension period, excluding the current rental
    const checkStartDate = new Date(currentEnd);
    checkStartDate.setDate(checkStartDate.getDate() + 1);
    const checkStartString = checkStartDate.toISOString().split("T")[0];

    const { data: conflictingRentals, error: conflictError } = await supabase
      .from("rentals")
      .select("id, start_date, end_date, rental_status")
      .eq("camera_id", rental.camera_id)
      .neq("id", rentalId) // Exclude the current rental
      .in("rental_status", ["confirmed", "active"])
      .or(`start_date.lte.${newEndDate},end_date.gte.${checkStartString}`);

    if (conflictError) {
      return { isAvailable: false, error: "Failed to check camera availability." };
    }

    const hasConflicts = conflictingRentals && conflictingRentals.length > 0;

    return hasConflicts
      ? { isAvailable: false, error: "Camera not available for requested dates - conflicts with other bookings." }
      : { isAvailable: true, error: null };
  } catch (error) {
    return { isAvailable: false, error: error.message || "Availability check failed." };
  }
}

// ------------------------------------------
//  -- User Functions  --
// ------------------------------------------

// User requests a rental extension.
export async function userRequestRentalExtension(rentalId, userId, newEndDate) {
  try {
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .select("end_date, price_per_day, camera_id, user_id")
      .eq("id", rentalId)
      .single();

    if (rentalError || !rental) {
      return { success: false, data: null, error: "Rental not found." };
    }

    if (rental.user_id !== userId) {
      return { success: false, data: null, error: "Unauthorized." };
    }

    const currentEnd = new Date(rental.end_date);
    const newEnd = new Date(newEndDate);
    currentEnd.setHours(0, 0, 0, 0);
    newEnd.setHours(0, 0, 0, 0);

    if (newEnd <= currentEnd) {
      return { success: false, data: null, error: "New end date must be after current." };
    }

    const availabilityCheck = await checkCameraAvailabilityForExtension(rentalId, newEndDate);
    if (!availabilityCheck.isAvailable) {
      return { success: false, data: null, error: availabilityCheck.error };
    }

    const extensionDays = Math.ceil((newEnd - currentEnd) / (1000 * 3600 * 24));
    if (extensionDays <= 0) {
      return { success: false, data: null, error: "Extension days must be positive." };
    }

    const additionalPrice = extensionDays * rental.price_per_day;

    const { data: extensionRecord, error: extensionError } = await supabase
      .from("rental_extensions")
      .insert({
        rental_id: rentalId,
        requested_by: userId,
        original_end_date: rental.end_date,
        requested_end_date: newEndDate,
        extension_days: extensionDays,
        additional_price: additionalPrice,
        extension_status: "pending",
      })
      .select()
      .single();

    if (extensionError) {
      return { success: false, data: null, error: "Failed to create extension request." };
    }

    const paymentResult = await adminCreateExtensionPayment(
      extensionRecord.id,
      rentalId,
      userId,
      additionalPrice
    );

    if (!paymentResult.success) {
      return { success: false, data: null, error: `Extension created, but payment failed: ${paymentResult.error}` };
    }

    return { success: true, data: { extension: extensionRecord, payment: paymentResult.data }, error: null };
  } catch (error) {
    return { success: false, data: null, error: error.message || "Extension request failed." };
  }
}

// Get a user's extension history.
export async function userGetExtensionHistory(userId) {
  try {
    const { data, error } = await supabase
      .from("rental_extensions")
      .select(`
        *,
        rentals (
          id, 
          start_date, 
          end_date, 
          camera_id, 
          cameras (name)
        )
      `)
      .eq("requested_by", userId)
      .order("requested_at", { ascending: false });

    if (error) throw error;

    // Fetch extension payments separately
    if (data && data.length > 0) {
      const extensionIds = data.map(ext => ext.id);
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .in("extension_id", extensionIds)
        .eq("payment_type", "extension");

      // Attach payments to extensions
      const extensionsWithPayments = data.map(ext => ({
        ...ext,
        payments: paymentsData?.filter(payment => payment.extension_id === ext.id) || []
      }));

      return { success: true, data: extensionsWithPayments, error: null };
    }

    return { success: true, data: data || [], error: null };
  } catch (error) {
    return { success: false, data: null, error: error.message || "Failed to fetch extension history." };
  }
}


// ------------------------------------------
//   -- Admin Functions --
// ------------------------------------------

// Admin creates a rental extension
export async function createAdminExtension(rentalId, extensionData, paymentFile) {
  try {
    // First, validate that the rental exists and is eligible for extension
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .select("id, user_id, end_date, price_per_day, camera_id, rental_status, shipping_status")
      .eq("id", rentalId)
      .single();

    if (rentalError || !rental) {
      return { success: false, data: null, error: "Rental not found." };
    }

    // Check eligibility
    const eligibilityResult = await checkExtensionEligibility(rentalId);
    if (!eligibilityResult.isEligible) {
      return { success: false, data: null, error: eligibilityResult.error };
    }

    const currentEnd = new Date(rental.end_date);
    const newEnd = new Date(extensionData.newEndDate);
    currentEnd.setHours(0, 0, 0, 0);
    newEnd.setHours(0, 0, 0, 0);

    if (newEnd <= currentEnd) {
      return { success: false, data: null, error: "New end date must be after current end date." };
    }

    // Check camera availability for extension period
    const availabilityCheck = await checkCameraAvailabilityForExtension(rentalId, extensionData.newEndDate);
    if (!availabilityCheck.isAvailable) {
      return { success: false, data: null, error: availabilityCheck.error };
    }

    const extensionDays = Math.ceil((newEnd - currentEnd) / (1000 * 3600 * 24));
    const additionalPrice = extensionDays * rental.price_per_day;

    // Create extension record with admin role
    const { data: extensionRecord, error: extensionError } = await supabase
      .from("rental_extensions")
      .insert({
        rental_id: rentalId,
        requested_by: extensionData.adminId,
        requested_by_role: 'admin',
        original_end_date: rental.end_date,
        requested_end_date: extensionData.newEndDate,
        extension_days: extensionDays,
        additional_price: additionalPrice,
        extension_status: "pending",
        admin_notes: extensionData.notes || null
      })
      .select()
      .single();

    if (extensionError) {
      return { success: false, data: null, error: "Failed to create extension request." };
    }

    // Handle payment file upload if provided
    if (paymentFile) {
      try {
        const paymentResult = await adminCreateExtensionPayment(
          extensionRecord.id,
          rentalId,
          rental.user_id,
          additionalPrice,
          paymentFile
        );

        if (!paymentResult.success) {
          return { success: false, data: null, error: `Extension created, but payment upload failed: ${paymentResult.error}` };
        }

        return { success: true, data: { extension: extensionRecord, payment: paymentResult.data }, error: null };
      } catch (paymentError) {
        return { success: false, data: null, error: `Extension created, but payment processing failed: ${paymentError.message}` };
      }
    }

    return { success: true, data: { extension: extensionRecord }, error: null };
  } catch (error) {
    return { success: false, data: null, error: error.message || "Failed to create admin extension." };
  }
}

// Check if rental is eligible for extension
export async function checkExtensionEligibility(rentalId) {
  try {
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .select("id, rental_status, shipping_status")
      .eq("id", rentalId)
      .single();

    if (rentalError || !rental) {
      return { isEligible: false, error: "Rental not found." };
    }

    // Check if rental is active and delivered
    if (rental.rental_status !== 'active') {
      return { isEligible: false, error: "Rental must be in active status to extend." };
    }

    if (rental.shipping_status !== 'delivered') {
      return { isEligible: false, error: "Camera must be delivered to extend rental." };
    }

    // Check for existing pending extensions
    const { data: pendingExtensions, error: extensionError } = await supabase
      .from("rental_extensions")
      .select("id")
      .eq("rental_id", rentalId)
      .eq("extension_status", "pending");

    if (extensionError) {
      return { isEligible: false, error: "Failed to check existing extensions." };
    }

    if (pendingExtensions && pendingExtensions.length > 0) {
      return { isEligible: false, error: "Rental already has a pending extension request." };
    }

    return { isEligible: true, error: null };
  } catch (error) {
    return { isEligible: false, error: error.message || "Extension eligibility check failed." };
  }
}

// Admin approves a rental extension request.
export async function adminApproveExtension(extensionId, adminId) {
  try {
    const { data: ext, error: fetchErr } = await supabase
      .from("rental_extensions")
      .select("id, rental_id, requested_end_date, extension_status")
      .eq("id", extensionId)
      .single();

    if (fetchErr || !ext) {
      return { success: false, data: null, error: "Extension not found." };
    }
    if (ext.extension_status !== "pending") {
      return { success: false, data: null, error: `Invalid status '${ext.extension_status}'.` };
    }

    const { data: updatedExt, error: updateExtErr } = await supabase
      .from("rental_extensions")
      .update({ extension_status: "approved", approved_at: new Date().toISOString() })
      .eq("id", extensionId)
      .select()
      .single();

    if (updateExtErr) throw updateExtErr;

    const { error: updateRentalErr } = await supabase
      .from("rentals")
      .update({ end_date: ext.requested_end_date })
      .eq("id", ext.rental_id);

    if (updateRentalErr) {
      throw new Error(`Extension approved but rental update failed: ${updateRentalErr.message}`);
    }

    return { success: true, data: updatedExt, error: null };
  } catch (err) {
    return { success: false, data: null, error: err.message || "Failed to approve extension." };
  }
}

// Admin rejects a rental extension request.
export async function adminRejectExtension(extensionId, adminId, notes = null) {
  try {
    const updates = { extension_status: "rejected", rejected_at: new Date().toISOString() };
    if (notes) updates.admin_notes = notes;

    const { data, error } = await supabase
      .from("rental_extensions")
      .update(updates)
      .eq("id", extensionId)
      .select()
      .single();

    if (error || !data) {
      return { success: false, data: null, error: "Extension not found or update failed." };
    }

    return { success: true, data, error: null };
  } catch (error) {
    return { success: false, data: null, error: error.message || "Failed to reject extension." };
  }
}

// Admin gets all pending extension requests.
export async function adminGetPendingExtensions() {
  try {
    const { data, error } = await supabase
      .from("rental_extensions")
      .select(`
        *,
        rentals (
          id, 
          start_date, 
          end_date, 
          camera_id, 
          cameras (name),
          users (id, first_name, last_name, email, contact_number)
        )
      `)
      .eq("extension_status", "pending")
      .order("requested_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [], error: null };
  } catch (error) {
    return { success: false, data: null, error: error.message || "Failed to fetch pending extensions." };
  }
}

// Admin gets all extension requests (for store population and real-time consistency)
export async function adminGetAllExtensions() {
  try {
    const { data, error } = await supabase
      .from("rental_extensions")
      .select(`
        *,
        rentals (
          id, 
          start_date, 
          end_date, 
          camera_id, 
          cameras (name),
          users (id, first_name, last_name, email, contact_number)
        )
      `)
      .order("requested_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [], error: null };
  } catch (error) {
    return { success: false, data: null, error: error.message || "Failed to fetch extensions." };
  }
}