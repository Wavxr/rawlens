// src/services/rentalService.js
// ===================================================================
// Service functions for managing camera rentals, including user requests and admin temporary bookings.
// ===================================================================

import { supabase } from "../lib/supabaseClient";
import { getCameraPricingTiers } from "./cameraService"; // For price calculation

// --- Helper Functions ---

// Calculates the number of rental days
function calculateRentalDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  const daysDiff = timeDiff / (1000 * 3600 * 24);
  return Math.ceil(daysDiff); // Use ceil to include the end day
}

// Calculates the total price based on rental days and camera pricing tiers
async function calculateTotalPrice(cameraId, startDate, endDate) {
  const rentalDays = calculateRentalDays(startDate, endDate);
  if (rentalDays <= 0) {
    throw new Error("Invalid rental period: End date must be after start date.");
  }

  const { data: tiers, error } = await getCameraPricingTiers(cameraId);
  if (error) {
    console.error("Error fetching pricing tiers:", error);
    throw new Error("Failed to fetch camera pricing information.");
  }

  const applicableTier = tiers.find(tier =>
    rentalDays >= tier.min_days && (tier.max_days === null || rentalDays <= tier.max_days)
  );

  if (!applicableTier) {
    throw new Error(`No pricing tier found for a rental of ${rentalDays} days.`);
  }

  return rentalDays * applicableTier.price_per_day;
}

// --- Rental Creation & Initialization ---

// Allows a registered user to initiate a rental request
export async function createUserRentalRequest(bookingData) {
  try {
    const { cameraId, startDate, endDate } = bookingData;

    // 1. Validate dates
    if (!startDate || !endDate) {
      throw new Error("Start date and end date are required.");
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      throw new Error("End date must be after start date.");
    }

    // 2. Check camera availability
    const isAvailable = await checkCameraAvailability(cameraId, startDate, endDate);
    if (!isAvailable.isAvailable) {
      throw new Error("Selected camera is not available for the chosen dates.");
    }

    // 3. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication error. Please log in.");
    }

    // 4. Calculate price
    const totalPrice = await calculateTotalPrice(cameraId, startDate, endDate);

    // 5. Insert rental request
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
        // Other statuses (contract_status, shipping_status, rental_status) will be NULL initially
      })
      .select();

    if (insertError) throw insertError;

    return { success: true, data: data[0] };
  } catch (error) {
    console.error("Error in createUserRentalRequest:", error);
    return { error: error.message || "Failed to create rental request." };
  }
}

// Allows an admin to create a rental for a customer without a system account
export async function createAdminTemporaryBooking(bookingData, adminId) {
  try {
    const { cameraId, startDate, endDate, customerName, customerContact, customerEmail } = bookingData;

    // 1. Validate required admin and customer data
    if (!adminId) {
      throw new Error("Admin ID is required.");
    }
    if (!customerName || !customerContact) {
      throw new Error("Customer name and contact information are required for temporary bookings.");
    }

    // 2. Validate dates
    if (!startDate || !endDate) {
      throw new Error("Start date and end date are required.");
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      throw new Error("End date must be after start date.");
    }

    // 3. Check camera availability
    const isAvailable = await checkCameraAvailability(cameraId, startDate, endDate);
    if (!isAvailable.isAvailable) {
      throw new Error("Selected camera is not available for the chosen dates.");
    }

    // 4. Calculate price
    const totalPrice = await calculateTotalPrice(cameraId, startDate, endDate);

    // 5. Insert temporary rental
    const { data, error: insertError } = await supabase
      .from('rentals')
      .insert({
        admin_id: adminId,
        camera_id: cameraId,
        start_date: startDate,
        end_date: endDate,
        total_price: totalPrice,
        customer_name: customerName,
        customer_contact: customerContact,
        customer_email: customerEmail || null,
        booking_type: 'temporary',
        admin_created: true,
        application_status: 'confirmed' // Admin creates confirmed temporary booking
        // Other statuses can be set as needed
      })
      .select();

    if (insertError) throw insertError;

    return { success: true, data: data[0] };
  } catch (error) {
    console.error("Error in createAdminTemporaryBooking:", error);
    return { error: error.message || "Failed to create temporary booking." };
  }
}

// --- Rental Information & Status Retrieval ---

// Fetches rentals associated with the current user
export async function getUserRentals() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication error.");
    }

    const { data, error } = await supabase
      .from('rentals')
      .select(`
        *,
        cameras (id, name, image_url)
      `)
      .or(`user_id.eq.${user.id},customer_contact.eq.${user.phone || ''}`) // Simplified, might need adjustment
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error in getUserRentals:", error);
    return { data: null, error: error.message || "Failed to fetch user rentals." };
  }
}

// Fetches rentals managed by a specific admin
export async function getAdminRentals(adminId) {
  try {
    // Optional: Add admin role check here if needed before query
    const { data, error } = await supabase
      .from('rentals')
      .select(`
        *,
        cameras (id, name, image_url),
        users!rentals_user_id_fkey (id, first_name, last_name, email, contact_number) // Join user details
      `)
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error in getAdminRentals:", error);
    return { data: null, error: error.message || "Failed to fetch admin rentals." };
  }
}

// Fetches details for a single rental
export async function getRentalById(rentalId) {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .select(`
        *,
        cameras (id, name, image_url, description),
        users!rentals_user_id_fkey (id, first_name, last_name, email, contact_number) // For registered user details
      `)
      .eq('id', rentalId)
      .maybeSingle(); // Use maybeSingle as RLS might cause it to return empty

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error in getRentalById:", error);
    return { data: null, error: error.message || "Failed to fetch rental details." };
  }
}

// Fetches rentals filtered by status
export async function getRentalsByStatus(statusFilters, adminId = null) {
  try {
    let query = supabase.from('rentals').select(`
        *,
        cameras (id, name, image_url),
        users!rentals_user_id_fkey (id, first_name, last_name, email, contact_number)
      `);

    // Apply status filters
    Object.entries(statusFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    // Optionally filter by admin
    if (adminId) {
      query = query.eq('admin_id', adminId);
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

// --- Rental Status Updates & Workflow Management ---

// Generic function to update rental status fields
export async function updateRentalStatus(rentalId, statusUpdates) {
  try {
    // Optional: Add validation for allowed statusUpdates fields/transitions
    const { data, error } = await supabase
      .from('rentals')
      .update(statusUpdates)
      .eq('id', rentalId)
      .select(); // Return updated data

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error("Error in updateRentalStatus:", error);
    return { error: error.message || "Failed to update rental status." };
  }
}

// Specific workflow functions (wrappers for updateRentalStatus)

export async function adminConfirmApplication(rentalId, adminId) {
  return await updateRentalStatus(rentalId, {
    application_status: 'confirmed',
    admin_id: adminId, // Ensure admin ID is set/correct
    confirmed_at: new Date().toISOString()
  });
}

export async function userSignContract(rentalId, signatureData) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication error.");
    }

    // RLS will ensure the user owns this rental
    const { data, error } = await supabase
      .from('rentals')
      .update({
        contract_status: 'signed',
        signature_data: signatureData,
        contract_signed_at: new Date().toISOString()
      })
      .eq('id', rentalId)
      .select();

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error("Error in userSignContract:", error);
    return { error: error.message || "Failed to save contract signature." };
  }
}

export async function adminConfirmContract(rentalId, adminId) {
  return await updateRentalStatus(rentalId, {
    contract_status: 'confirmed',
    // Could also set shipping_status or rental_status here based on workflow
    // e.g., shipping_status: 'ready_to_ship'
  });
}

export async function adminMarkShipped(rentalId, adminId) {
  return await updateRentalStatus(rentalId, {
    shipping_status: 'in_transit',
    shipped_at: new Date().toISOString()
  });
}

export async function adminMarkDelivered(rentalId, adminId) {
  return await updateRentalStatus(rentalId, {
    shipping_status: 'delivered',
    delivered_at: new Date().toISOString(),
    rental_status: 'active'
  });
}

// For registered users initiating return
export async function userInitiateReturn(rentalId) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication error.");
    }

    // RLS handles access control
    const { data, error } = await supabase
      .from('rentals')
      .update({
        shipping_status: 'return_scheduled',
        return_initiated_at: new Date().toISOString()
      })
      .eq('id', rentalId)
      .select();

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error("Error in userInitiateReturn:", error);
    return { error: error.message || "Failed to initiate return." };
  }
}

// Admin marks return initiated for temporary user
export async function adminMarkReturnInitiated(rentalId, adminId) {
  return await updateRentalStatus(rentalId, {
    shipping_status: 'return_scheduled',
    return_initiated_at: new Date().toISOString()
  });
}

export async function adminMarkReturned(rentalId, adminId) {
  return await updateRentalStatus(rentalId, {
    shipping_status: 'return_completed',
    returned_at: new Date().toISOString(),
    rental_status: 'completed'
  });
}

export async function adminMarkBookingDone(rentalId, adminId) {
  return await updateRentalStatus(rentalId, {
    completed_at: new Date().toISOString()
    // rental_status is likely already 'completed' from adminMarkReturned
  });
}

// --- Availability Checking ---

// Check if a specific camera is available for a given date range
export async function checkCameraAvailability(cameraId, startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .select('id, start_date, end_date, application_status')
      .eq('camera_id', cameraId)
      .in('application_status', ['confirmed', 'active'])
      .lt('start_date', endDate) // Overlap condition 1
      .gt('end_date', startDate); // Overlap condition 2

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

// Find all cameras available for a specific date range
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