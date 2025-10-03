import { supabase } from "../lib/supabaseClient";
import { uploadFile, objectPath, getSignedUrl, deleteFile } from "./storageService";
import { createAdminBookingPayment } from "./paymentService";

const CONTRACTS_BUCKET = 'contracts';
const RECEIPTS_BUCKET = 'payment-receipts';
const ADMIN_BOOKING_FOLDER = 'admin-bookings';

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

// --- Helper Functions ---

function buildAdminStoragePath(rentalId, type, ext, options = {}) {
  const composedType = `${ADMIN_BOOKING_FOLDER}/${type}`;
  return objectPath(rentalId, composedType, ext, options);
}

async function getActingAdminId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const userId = data?.user?.id;
  if (!userId) {
    throw new Error('Unable to determine current admin user. Please sign in again.');
  }
  return userId;
}

function isStoragePath(path) {
  return typeof path === 'string' && !path.startsWith('http');
}

export async function uploadAdminContract(rentalId, file) {
  if (!rentalId) throw new Error('Rental ID is required.');
  if (!file) throw new Error('No file provided for upload.');
  if (file.type && file.type !== 'application/pdf') {
    throw new Error('Contract must be a PDF file.');
  }

  const storageKey = buildAdminStoragePath(rentalId, 'contract', 'pdf', { versioned: false });

  await uploadFile(CONTRACTS_BUCKET, storageKey, file);

  const { error: updateError } = await supabase
    .from('rentals')
    .update({ contract_pdf_url: storageKey })
    .eq('id', rentalId);

  if (updateError) throw updateError;

  const signedUrl = await getSignedUrl(CONTRACTS_BUCKET, storageKey, { expiresIn: 3600 });

  return {
    storagePath: storageKey,
    signedUrl
  };
}

export async function uploadAdminPaymentReceipt(rentalId, file) {
  if (!rentalId) throw new Error('Rental ID is required.');
  if (!file) throw new Error('No file provided for upload.');
  if (!file.type?.startsWith('image/')) {
    throw new Error('Payment receipt must be an image file.');
  }

  const ext = file.name?.split('.').pop()?.toLowerCase() || 'jpg';
  const storageKey = buildAdminStoragePath(rentalId, 'receipt', ext);

  await uploadFile(RECEIPTS_BUCKET, storageKey, file);

  const signedUrl = await getSignedUrl(RECEIPTS_BUCKET, storageKey, { expiresIn: 3600 });

  const adminId = await getActingAdminId();

  const { data: rental, error: rentalError } = await supabase
    .from('rentals')
    .select('total_price')
    .eq('id', rentalId)
    .single();

  if (rentalError) throw rentalError;

  const amount = Number(rental?.total_price) || 0;

  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('rental_id', rentalId)
    .eq('payment_type', 'rental')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingPayment?.id) {
    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({
        payment_receipt_url: signedUrl,
        payment_reference: storageKey,
        user_id: adminId,
        amount,
        payment_status: 'submitted'
      })
      .eq('id', existingPayment.id);

    if (updatePaymentError) throw updatePaymentError;

    return {
      storagePath: storageKey,
      signedUrl,
      paymentId: existingPayment.id
    };
  }

  const payment = await createAdminBookingPayment({
    rentalId,
    amount,
    receiptUrl: signedUrl,
    receiptPath: storageKey,
    createdBy: adminId
  });

  return {
    storagePath: storageKey,
    signedUrl,
    paymentId: payment.id
  };
}

export async function deleteAdminDocument(rentalId, documentType, paymentId = null) {
  if (!rentalId) throw new Error('Rental ID is required.');

  if (documentType === 'contract') {
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .select('contract_pdf_url')
      .eq('id', rentalId)
      .single();

    if (rentalError) throw rentalError;
    if (!rental?.contract_pdf_url) {
      throw new Error('No contract found for this booking.');
    }

    await deleteFile(CONTRACTS_BUCKET, rental.contract_pdf_url);

    const { error: updateError } = await supabase
      .from('rentals')
      .update({ contract_pdf_url: null })
      .eq('id', rentalId);

    if (updateError) throw updateError;
    return true;
  }

  if (documentType === 'receipt') {
    let paymentRecord = null;

    if (paymentId) {
      const { data } = await supabase
        .from('payments')
        .select('id, payment_reference')
        .eq('id', paymentId)
        .maybeSingle();
      paymentRecord = data;
    }

    if (!paymentRecord) {
      const { data } = await supabase
        .from('payments')
        .select('id, payment_reference')
        .eq('rental_id', rentalId)
        .eq('payment_type', 'rental')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      paymentRecord = data;
    }

    if (!paymentRecord?.payment_reference) {
      throw new Error('No payment receipt found for this booking.');
    }

    await deleteFile(RECEIPTS_BUCKET, paymentRecord.payment_reference);

    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({
        payment_receipt_url: null,
        payment_reference: null,
        payment_status: 'pending'
      })
      .eq('id', paymentRecord.id);

    if (updatePaymentError) throw updatePaymentError;

    return true;
  }

  throw new Error('Unsupported document type.');
}

export async function getAdminDocumentUrls(rentalId) {
  if (!rentalId) throw new Error('Rental ID is required.');

  const result = { contract: null, receipt: null };

  const { data: rental, error: rentalError } = await supabase
    .from('rentals')
    .select('contract_pdf_url')
    .eq('id', rentalId)
    .single();

  if (rentalError) throw rentalError;

  if (rental?.contract_pdf_url) {
    const signedUrl = await getSignedUrl(CONTRACTS_BUCKET, rental.contract_pdf_url, { expiresIn: 3600 });
    result.contract = {
      signedUrl,
      storagePath: rental.contract_pdf_url
    };
  }

  const { data: payment } = await supabase
    .from('payments')
    .select('id, payment_receipt_url, payment_reference')
    .eq('rental_id', rentalId)
    .eq('payment_type', 'rental')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (payment) {
    const storagePath = payment.payment_reference || (isStoragePath(payment.payment_receipt_url) ? payment.payment_receipt_url : null);
    let signedUrl = payment.payment_receipt_url;

    if (storagePath) {
      signedUrl = await getSignedUrl(RECEIPTS_BUCKET, storagePath, { expiresIn: 3600 });
    }

    result.receipt = {
      signedUrl: signedUrl || null,
      storagePath,
      paymentId: payment.id
    };
  }

  return result;
}

/**
 * Calculate rental duration in days (inclusive)
 */
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

/**
 * Calculate pricing based on camera_pricing_tiers table
 */
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

// --- Core Booking Functions ---

/**
 * Create a new booking (confirmed or potential)
 */
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

    if (contractFile) {
      try {
        await uploadAdminContract(data.id, contractFile);
      } catch (contractError) {
        console.error('Contract upload error:', contractError);
        warnings.push(contractError.message || 'Contract upload failed.');
      }
    }

    if (receiptFile) {
      try {
        await uploadAdminPaymentReceipt(data.id, receiptFile);
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

/**
 * Get all potential bookings (temporary + pending)
 */
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

/**
 * Convert potential booking to confirmed
 */
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

/**
 * Update potential booking details
 */
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

/**
 * Delete a potential booking
 */
export async function deletePotentialBooking(bookingId) {
  try {
    const { error } = await supabase
      .from('rentals')
      .delete()
      .eq('id', bookingId)
      .eq('booking_type', 'temporary'); // Safety check to only delete temporary bookings

    if (error) {
      throw new Error(`Failed to delete booking: ${error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting potential booking:', error);
    return { success: false, error: error.message };
  }
}

// --- Conflict Detection Functions ---

/**
 * Check for booking conflicts with a specific camera and date range
 */
export async function checkBookingConflicts(cameraId, startDate, endDate, excludeBookingId = null) {
  try {
    // First, let's see ALL bookings for this camera to debug
    const { data: allBookings, error: debugError } = await supabase
      .from('rentals')
      .select('id, rental_status, start_date, end_date, customer_name, booking_type')
      .eq('camera_id', cameraId);

    let query = supabase
      .from('rentals')
      .select('id, rental_status, start_date, end_date, customer_name, booking_type')
      .eq('camera_id', cameraId)
      .in('rental_status', ['confirmed', 'active', 'completed']) // Include confirmed, active, and completed bookings
      .lte('start_date', endDate)
      .gte('end_date', startDate);

    // Exclude specific booking if provided
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
        conflictingBookings: conflicts || []
      }
    };
  } catch (error) {
    console.error('Error checking booking conflicts:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all current conflicts in the system
 */
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

// --- Calendar Data Functions ---

/**
 * Get confirmed bookings for calendar display
 * Excludes potential bookings to show only confirmed availability
 */
export async function getCalendarBookings(startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .select(BOOKING_SELECT_QUERY)
      .in('rental_status', ['confirmed', 'active', 'completed'])
      .lte('start_date', endDate)
      .gte('end_date', startDate)
      .order('start_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch calendar bookings: ${error.message}`);
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching calendar bookings:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Get bookings for a specific camera and month
 */
export async function getBookingsByCamera(cameraId, month, year) {
  try {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

    const { data, error } = await supabase
      .from('rentals')
      .select(BOOKING_SELECT_QUERY)
      .eq('camera_id', cameraId)
      .lte('start_date', endDate)
      .gte('end_date', startDate)
      .order('start_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch camera bookings: ${error.message}`);
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching camera bookings:', error);
    return { success: false, error: error.message, data: [] };
  }
}

// --- Availability Functions ---

/**
 * Quick availability check for a camera and date range
 */
export async function isDateRangeAvailable(cameraId, startDate, endDate) {
  try {
    const conflictCheck = await checkBookingConflicts(cameraId, startDate, endDate);
    
    if (!conflictCheck.success) {
      return { success: false, error: conflictCheck.error };
    }

    return {
      success: true,
      isAvailable: !conflictCheck.data.hasConflicts,
      conflicts: conflictCheck.data.conflictingBookings
    };
  } catch (error) {
    console.error('Error checking date range availability:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Suggest alternative dates when conflicts exist
 */
export async function suggestAlternativeDates(cameraId, startDate, endDate) {
  try {
    const rentalDays = calculateBookingDuration(startDate, endDate);
    const start = new Date(startDate);
    const suggestions = [];

    // Check dates within 2 weeks before and after
    for (let offset = -14; offset <= 14; offset += rentalDays) {
      if (offset === 0) continue; // Skip original dates

      const alternativeStart = new Date(start);
      alternativeStart.setDate(start.getDate() + offset);
      const alternativeEnd = new Date(alternativeStart);
      alternativeEnd.setDate(alternativeStart.getDate() + rentalDays - 1);

      const availabilityCheck = await isDateRangeAvailable(
        cameraId,
        alternativeStart.toISOString().split('T')[0],
        alternativeEnd.toISOString().split('T')[0]
      );

      if (availabilityCheck.success && availabilityCheck.isAvailable) {
        suggestions.push({
          startDate: alternativeStart.toISOString().split('T')[0],
          endDate: alternativeEnd.toISOString().split('T')[0],
          offsetDays: offset
        });

        // Limit to 5 suggestions
        if (suggestions.length >= 5) break;
      }
    }

    return { success: true, data: suggestions };
  } catch (error) {
    console.error('Error suggesting alternative dates:', error);
    return { success: false, error: error.message, data: [] };
  }
}

// --- Admin Actions for Temporary Bookings ---

/**
 * Admin confirms equipment received by customer
 */
export async function adminConfirmReceived(bookingId) {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .update({ rental_status: 'active' })
      .eq('id', bookingId)
      .eq('booking_type', 'temporary')
      .select(BOOKING_SELECT_QUERY)
      .single();

    if (error) {
      throw new Error(`Failed to mark as received: ${error.message}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error confirming equipment received:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Admin confirms equipment returned by customer
 */
export async function adminConfirmReturned(bookingId) {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .update({ rental_status: 'completed' })
      .eq('id', bookingId)
      .eq('booking_type', 'temporary')
      .select(BOOKING_SELECT_QUERY)
      .single();

    if (error) {
      throw new Error(`Failed to mark as returned: ${error.message}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error confirming equipment returned:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Admin marks equipment as delivered to customer
 */
export async function adminMarkDelivered(bookingId) {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .update({ shipping_status: 'delivered' })
      .eq('id', bookingId)
      .eq('booking_type', 'temporary')
      .select(BOOKING_SELECT_QUERY)
      .single();

    if (error) {
      throw new Error(`Failed to mark as delivered: ${error.message}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error marking as delivered:', error);
    return { success: false, error: error.message };
  }
}
