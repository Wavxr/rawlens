import { supabase } from "../lib/supabaseClient";
import { uploadContractPdf } from './pdfService';
import { createAdminBookingPayment, uploadPaymentReceipt } from './paymentService';

// --- Constants ---
const BOOKING_SELECT_QUERY = `
  id,
  user_id,
  camera_id,
  start_date,
  end_date,
  total_price,
  rental_status,
  customer_name,
  customer_contact,
  customer_email,
  created_at,
  booking_type,
  contract_pdf_url,
  shipping_status,
  price_per_day,
  cameras (
    id,
    name,
    image_url,
    description,
    camera_status
  ),
  users!rentals_user_id_fkey (
    id,
    first_name,
    last_name,
    email,
    contact_number
  )
`;

// ------------------------------------------
//   --  Helper Functions -- 
// ------------------------------------------

// Calculate rental duration in days (inclusive)
export function calculateBookingDuration(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const timeDiff = end.getTime() - start.getTime();
  
  if (timeDiff < 0) {
    throw new Error("End date cannot be before start date");
  }
  
  return Math.floor(timeDiff / (1000 * 3600 * 24)) + 1;
}

// Calculate pricing based on camera_pricing_tiers table
export async function calculateQuickBookingPrice(cameraId, startDate, endDate) {
  try {
    const rentalDays = calculateBookingDuration(startDate, endDate);

    const { data: tiers, error } = await supabase
      .from('camera_pricing_tiers')
      .select('min_days, max_days, price_per_day, description')
      .eq('camera_id', cameraId)
      .order('min_days', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch pricing tiers: ${error.message}`);
    }

    if (!tiers || tiers.length === 0) {
      throw new Error(`No pricing tiers found for camera`);
    }

    // Find applicable tier based on rental duration
    const applicableTier = tiers.find(tier =>
      rentalDays >= tier.min_days && 
      (tier.max_days === null || rentalDays <= tier.max_days)
    );

    if (!applicableTier) {
      throw new Error(`No pricing tier available for ${rentalDays} days`);
    }

    const pricePerDay = parseFloat(applicableTier.price_per_day);
    const totalPrice = rentalDays * pricePerDay;

    return {
      totalPrice,
      pricePerDay,
      rentalDays,
      tierDescription: applicableTier.description
    };
  } catch (error) {
    console.error('Error calculating booking price:', error);
    throw error;
  }
}

// Generic function to update booking status with validation
async function updateBookingStatus(bookingId, updates, actionDescription) {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .update(updates)
      .eq('id', bookingId)
      .eq('booking_type', 'temporary')
      .select(BOOKING_SELECT_QUERY)
      .single();

    if (error) throw new Error(`Failed to ${actionDescription}: ${error.message}`);
    return { success: true, data };
  } catch (err) {
    console.error(`Error while trying to ${actionDescription}:`, err);
    return { success: false, error: err.message };
  }
}

// ------------------------------------------
//   --  Core Functions -- 
// ------------------------------------------

// Create a new booking (confirmed or potential) for admin
export async function createQuickBooking(bookingData, files = {}) {
  try {
    const {
      cameraId,
      startDate,
      endDate,
      customerName,
      customerContact,
      customerEmail,
      bookingType
    } = bookingData;
    const { contractFile = null, receiptFile = null } = files;

    // Validate required fields
    if (!cameraId || !startDate || !endDate || !customerName || !customerContact) {
      throw new Error('Missing required booking information');
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      throw new Error('Invalid date range');
    }

    // Calculate pricing
    const pricingInfo = await calculateQuickBookingPrice(cameraId, startDate, endDate);

    // Determine booking status based on type
    let rentalStatus = 'pending';
    if (bookingType === 'confirmed') {
      rentalStatus = 'confirmed';
    } else if (bookingType === 'completed') {
      rentalStatus = 'completed';
    }
    const bookingTypeValue = 'temporary'; // All admin-created bookings are temporary

    // Create booking record
    const { data, error } = await supabase
      .from('rentals')
      .insert({
        user_id: null, // Temporary bookings don't have user_id
        camera_id: cameraId,
        start_date: startDate,
        end_date: endDate,
        total_price: pricingInfo.totalPrice,
        price_per_day: pricingInfo.pricePerDay,
        rental_status: rentalStatus,
        customer_name: customerName.trim(),
        customer_contact: customerContact.trim(),
        customer_email: customerEmail?.trim() || null,
        booking_type: bookingTypeValue,
        contract_pdf_url: null
      })
      .select(BOOKING_SELECT_QUERY)
      .single();

    if (error) {
      throw new Error(`Failed to create booking: ${error.message}`);
    }

    const warnings = [];

    // Admin contract upload (manual PDF). We store only the storage path and update rentals.contract_pdf_url
    if (contractFile) {
      try {
        const buffer = await contractFile.arrayBuffer();
        const pdfBytes = new Uint8Array(buffer);
        const { success, filePath, error: contractErr } = await uploadContractPdf(pdfBytes, data.id, {
          scope: 'admin',
          customerName: data.customer_name
        });
        if (!success) {
          throw new Error(contractErr || 'Failed to upload contract');
        }
        const { error: updErr } = await supabase
          .from('rentals')
          .update({ contract_pdf_url: filePath })
          .eq('id', data.id);
        if (updErr) throw new Error(updErr.message);
      } catch (contractError) {
        console.error('Contract upload error:', contractError);
        warnings.push(contractError.message || 'Contract upload failed.');
      }
    }

    // Admin payment receipt upload: create a payment record then attach receipt (path only)
    if (receiptFile) {
      try {
        // Fetch acting admin user id
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr || !authData?.user) throw new Error('Auth required for receipt upload');
        const adminUserId = authData.user.id;
        const paymentRecord = await createAdminBookingPayment({
          rentalId: data.id,
            amount: pricingInfo.totalPrice,
          createdBy: adminUserId
        });
        const uploadResult = await uploadPaymentReceipt({
          paymentId: paymentRecord.id,
          rentalId: data.id,
          file: receiptFile,
          scope: 'admin'
        });
        if (!uploadResult.success) throw new Error(uploadResult.error || 'Failed to upload receipt');
      } catch (receiptError) {
        console.error('Receipt upload error:', receiptError);
        warnings.push(receiptError.message || 'Payment receipt upload failed.');
      }
    }

    const { data: refreshedBooking, error: refreshError } = await supabase
      .from('rentals')
      .select(BOOKING_SELECT_QUERY)
      .eq('id', data.id)
      .single();

    const bookingResult = refreshError ? data : refreshedBooking;

    return { success: true, data: bookingResult, warnings };
  } catch (error) {
    console.error('Error creating quick booking:', error);
    return { success: false, error: error.message };
  }
}

/// Get all potential bookings (temporary + pending)
export async function getPotentialBookings() {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .select(BOOKING_SELECT_QUERY)
      .eq('booking_type', 'temporary')
      .eq('rental_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch potential bookings: ${error.message}`);
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching potential bookings:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/// Convert potential booking to confirmed
export async function convertPotentialToConfirmed(bookingId) {
  try {
    // First, check if booking exists and is potential
    const { data: existingBooking, error: fetchError } = await supabase
      .from('rentals')
      .select('id, camera_id, start_date, end_date, booking_type, rental_status')
      .eq('id', bookingId)
      .single();

    if (fetchError) {
      throw new Error(`Booking not found: ${fetchError.message}`);
    }

    if (existingBooking.booking_type !== 'temporary' || existingBooking.rental_status !== 'pending') {
      throw new Error('Only potential bookings can be converted to confirmed');
    }

    // Check for conflicts with confirmed bookings
    const conflicts = await checkBookingConflicts(
      existingBooking.camera_id,
      existingBooking.start_date,
      existingBooking.end_date,
      bookingId
    );

    if (!conflicts.success || conflicts.data.hasConflicts) {
      throw new Error('Cannot confirm booking due to conflicts with existing confirmed bookings');
    }

    // Update status to confirmed
    const { data, error } = await supabase
      .from('rentals')
      .update({ rental_status: 'confirmed' })
      .eq('id', bookingId)
      .select(BOOKING_SELECT_QUERY)
      .single();

    if (error) {
      throw new Error(`Failed to confirm booking: ${error.message}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error converting potential to confirmed:', error);
    return { success: false, error: error.message };
  }
}

// Update potential booking details
export async function updatePotentialBooking(bookingId, updates) {
  try {
    const {
      cameraId,
      startDate,
      endDate,
      customerName,
      customerContact,
      customerEmail
    } = updates;

    // Validate that this is a potential booking
    const { data: existingBooking, error: fetchError } = await supabase
      .from('rentals')
      .select('booking_type, rental_status, camera_id, start_date, end_date')
      .eq('id', bookingId)
      .single();

    if (fetchError) {
      throw new Error(`Booking not found: ${fetchError.message}`);
    }

    if (existingBooking.booking_type !== 'temporary' || existingBooking.rental_status !== 'pending') {
      throw new Error('Only potential bookings can be updated');
    }

    // Prepare update object
    const updateData = {};

    if (customerName) updateData.customer_name = customerName.trim();
    if (customerContact) updateData.customer_contact = customerContact.trim();
    if (customerEmail !== undefined) updateData.customer_email = customerEmail?.trim() || null;

    // Handle date/camera changes
    if (cameraId || startDate || endDate) {
      if (cameraId) updateData.camera_id = cameraId;
      if (startDate) updateData.start_date = startDate;
      if (endDate) updateData.end_date = endDate;

      // Recalculate pricing if dates or camera changed
      const finalCameraId = cameraId || existingBooking.camera_id;
      const finalStartDate = startDate || existingBooking.start_date;
      const finalEndDate = endDate || existingBooking.end_date;

      const pricingInfo = await calculateQuickBookingPrice(finalCameraId, finalStartDate, finalEndDate);
      updateData.total_price = pricingInfo.totalPrice;
      updateData.price_per_day = pricingInfo.pricePerDay;
    }

    // Update the booking
    const { data, error } = await supabase
      .from('rentals')
      .update(updateData)
      .eq('id', bookingId)
      .select(BOOKING_SELECT_QUERY)
      .single();

    if (error) {
      throw new Error(`Failed to update booking: ${error.message}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error updating potential booking:', error);
    return { success: false, error: error.message };
  }
}

// Delete a potential booking
export async function deletePotentialBooking(bookingId) {
  try {
    const { error } = await supabase
      .from('rentals')
      .delete()
      .eq('id', bookingId)
      .eq('booking_type', 'temporary'); 

    if (error) {
      throw new Error(`Failed to delete booking: ${error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting potential booking:', error);
    return { success: false, error: error.message };
  }
}

// ------------------------------------------
//   -- Admin Functions -- 
// ------------------------------------------

// Admin confirms equipment received by customer
export async function adminConfirmReceived(bookingId) {
  return updateBookingStatus(bookingId, { rental_status: 'active' }, 'mark as received');
}

// Admin confirms equipment returned by customer
export async function adminConfirmReturned(bookingId) {
  return updateBookingStatus(bookingId, { rental_status: 'completed' }, 'mark as returned');
}

// Admin marks equipment as delivered to customer
export async function adminMarkDelivered(bookingId) {
  return updateBookingStatus(bookingId, { shipping_status: 'delivered' }, 'mark as delivered');
}

// ------------------------------------------
//   --  Conflict Detection Functions -- 
// ------------------------------------------

// Check for booking conflicts with a specific camera and date range
export async function checkBookingConflicts(cameraId, startDate, endDate, excludeBookingId = null) {
  try {
    // Build base query
    let query = supabase
      .from('rentals')
      .select('id, rental_status, start_date, end_date, customer_name, booking_type')
      .eq('camera_id', cameraId)
      .in('rental_status', ['confirmed', 'active', 'completed'])
      .lte('start_date', endDate)
      .gte('end_date', startDate);

    // Optionally exclude a specific booking
    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }

    const { data: conflicts, error } = await query;

    if (error) {
      throw new Error(`Failed to check conflicts: ${error.message}`);
    }

    return {
      success: true,
      data: {
        hasConflicts: conflicts.length > 0,
        conflictingBookings: conflicts,
      },
    };
  } catch (error) {
    console.error('Error checking booking conflicts:', error);
    return { success: false, error: error.message };
  }
}

// Get all current conflicts in the system
export async function getBookingConflicts() {
  try {
    // Get all potential bookings
    const { data: potentialBookings, error: potentialError } = await supabase
      .from('rentals')
      .select('id, camera_id, start_date, end_date, customer_name')
      .eq('booking_type', 'temporary')
      .eq('rental_status', 'pending');

    if (potentialError) {
      throw new Error(`Failed to fetch potential bookings: ${potentialError.message}`);
    }

    const conflictResults = [];

    // Check each potential booking for conflicts
    for (const booking of potentialBookings || []) {
      const conflictCheck = await checkBookingConflicts(
        booking.camera_id,
        booking.start_date,
        booking.end_date,
        booking.id
      );

      if (conflictCheck.success && conflictCheck.data.hasConflicts) {
        conflictResults.push({
          potentialBooking: booking,
          conflicts: conflictCheck.data.conflictingBookings
        });
      }
    }

    return { success: true, data: conflictResults };
  } catch (error) {
    console.error('Error getting booking conflicts:', error);
    return { success: false, error: error.message, data: [] };
  }
}

// ------------------------------------------
//   --  Calendar Data Functions -- 
// ------------------------------------------

// Get confirmed bookings for calendar display (excludes pending bookings)
export async function getCalendarBookings(startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .select(BOOKING_SELECT_QUERY)
      .in('rental_status', ['confirmed', 'active', 'completed'])
      .lte('start_date', endDate)
      .gte('end_date', startDate)
      .order('start_date', { ascending: true });

    if (error) throw new Error(`Failed to fetch calendar bookings: ${error.message}`);

    return { success: true, data: data ?? [] };
  } catch (err) {
    console.error('Error fetching calendar bookings:', err);
    return { success: false, error: err.message, data: [] };
  }
}

// Get bookings for a specific camera and month
export async function getBookingsByCamera(cameraId, month, year) {
  try {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('rentals')
      .select(BOOKING_SELECT_QUERY)
      .eq('camera_id', cameraId)
      .lte('start_date', endDate)
      .gte('end_date', startDate)
      .order('start_date');

    if (error) throw new Error(`Failed to fetch camera bookings: ${error.message}`);

    return { success: true, data: data ?? [] };
  } catch (err) {
    console.error('Error fetching camera bookings:', err);
    return { success: false, error: err.message, data: [] };
  }
}


// ------------------------------------------
//   -- Availability Functions -- 
// ------------------------------------------

// Quick availability check for a camera and date range
export async function isDateRangeAvailable(cameraId, startDate, endDate) {
  try {
    const { success, data, error } = await checkBookingConflicts(cameraId, startDate, endDate);
    if (!success) return { success: false, error };

    return {
      success: true,
      isAvailable: !data.hasConflicts,
      conflicts: data.conflictingBookings,
    };
  } catch (err) {
    console.error('Error checking date range availability:', err);
    return { success: false, error: err.message };
  }
}


// Suggest alternative dates when conflicts exist
export async function suggestAlternativeDates(cameraId, startDate, endDate) {
  try {
    const rentalDays = calculateBookingDuration(startDate, endDate);
    const baseDate = new Date(startDate);
    const suggestions = [];

    // Search 2 weeks before and after the original range
    for (let offset = -14; offset <= 14 && suggestions.length < 5; offset += rentalDays) {
      if (offset === 0) continue;

      const altStart = new Date(baseDate);
      altStart.setDate(baseDate.getDate() + offset);

      const altEnd = new Date(altStart);
      altEnd.setDate(altStart.getDate() + rentalDays - 1);

      const startStr = altStart.toISOString().split('T')[0];
      const endStr = altEnd.toISOString().split('T')[0];

      const { success, isAvailable } = await isDateRangeAvailable(cameraId, startStr, endStr);
      if (success && isAvailable) {
        suggestions.push({ startDate: startStr, endDate: endStr, offsetDays: offset });
      }
    }

    return { success: true, data: suggestions };
  } catch (err) {
    console.error('Error suggesting alternative dates:', err);
    return { success: false, error: err.message, data: [] };
  }
}