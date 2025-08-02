// src/services/calendarService.js
// ===================================================================
// Service functions for optimized calendar data retrieval and related operations.
// ===================================================================

import { supabase } from "../lib/supabaseClient";
import { checkCameraAvailability } from "./rentalService";

// --- Admin Calendar Views & Management ---

// Fetches rental data for an admin's calendar view over a specific period, optionally filtered by camera.
export async function getAdminCalendarViewData(adminId, startDate, endDate, cameraId = null) {
  try {
    let query = supabase
      .from('rentals')
      .select(`
        id,
        camera_id,
        user_id,
        customer_name,
        customer_contact,
        start_date,
        end_date,
        application_status,
        contract_status,
        shipping_status,
        rental_status,
        booking_type,
        cameras (name)
      `)
      .eq('admin_id', adminId)
      .lte('start_date', endDate)
      .gte('end_date', startDate);

    if (cameraId) {
      query = query.eq('camera_id', cameraId);
    }

    // Order might depend on specific UI needs, e.g., by start_date
    query = query.order('start_date', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error in getAdminCalendarViewData:", error);
    return { data: null, error: error.message || "Failed to fetch admin calendar data." };
  }
}

// Fetches all rentals for a specific camera for a given year, for detailed calendar planning.
export async function getCameraCalendarViewData(cameraId, year, adminId = null) {
  try {
    let query = supabase
      .from('rentals')
      .select(`
        id,
        user_id,
        customer_name,
        customer_contact,
        start_date,
        end_date,
        application_status,
        contract_status,
        shipping_status,
        rental_status,
        booking_type,
        admin_id
      `)
      .eq('camera_id', cameraId)
      .or(`extract(year from start_date).eq.${year},extract(year from end_date).eq.${year}`);

    if (adminId) {
      query = query.eq('admin_id', adminId);
    }

    query = query.order('start_date', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error in getCameraCalendarViewData:", error);
    return { data: null, error: error.message || "Failed to fetch camera calendar data." };
  }
}

// --- User Calendar View (Simplified) ---

// Fetches a user's own rental bookings for display on a simplified calendar view.
export async function getUserRentalCalendarData() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication error.");
    }

    const { data, error } = await supabase
      .from('rentals')
      .select(`
        id,
        camera_id,
        start_date,
        end_date,
        application_status,
        contract_status,
        shipping_status,
        rental_status,
        cameras (name)
      `)
      .eq('user_id', user.id) // RLS will also enforce this
      .order('start_date', { ascending: false }); // Show newest first, adjust if needed

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error in getUserRentalCalendarData:", error);
    return { data: null, error: error.message || "Failed to fetch user rental calendar data." };
  }
}

// --- Availability & Utilization Reporting ---

// Calculates how much a specific camera is booked within a given period.
export async function getCameraUtilizationReport(cameraId, reportStartDate, reportEndDate) {
  try {
    const { data: bookings, error } = await supabase
      .from('rentals')
      .select('start_date, end_date')
      .eq('camera_id', cameraId)
      .in('application_status', ['confirmed', 'active']) // Consider relevant statuses
      .lt('start_date', reportEndDate)
      .gt('end_date', reportStartDate);

    if (error) throw error;

    let totalBookedDays = 0;
    const reportStart = new Date(reportStartDate);
    const reportEnd = new Date(reportEndDate);

    bookings.forEach(booking => {
      const bookingStart = new Date(booking.start_date);
      const bookingEnd = new Date(booking.end_date);

      // Calculate the overlapping period
      const overlapStart = bookingStart > reportStart ? bookingStart : reportStart;
      const overlapEnd = bookingEnd < reportEnd ? bookingEnd : reportEnd;

      if (overlapStart < overlapEnd) {
        const bookedMilliseconds = overlapEnd - overlapStart;
        const bookedDays = Math.ceil(bookedMilliseconds / (1000 * 60 * 60 * 24));
        totalBookedDays += bookedDays;
      }
    });

    const totalPeriodMilliseconds = reportEnd - reportStart;
    const totalPeriodDays = Math.ceil(totalPeriodMilliseconds / (1000 * 60 * 60 * 24));
    const utilizationPercentage = totalPeriodDays > 0 ? (totalBookedDays / totalPeriodDays) * 100 : 0;

    return {
      totalBookedDays,
      utilizationPercentage: parseFloat(utilizationPercentage.toFixed(2)),
      error: null
    };
  } catch (error) {
    console.error("Error in getCameraUtilizationReport:", error);
    return { totalBookedDays: 0, utilizationPercentage: 0, error: error.message || "Failed to calculate utilization report." };
  }
}

// Provides a list of booked periods for a camera within a range.
export async function getAvailabilityForDateRange(cameraId, startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .select('id, start_date, end_date, application_status')
      .eq('camera_id', cameraId)
      .in('application_status', ['confirmed', 'pending', 'active']) // Relevant statuses
      .lt('start_date', endDate)
      .gt('end_date', startDate)
      .order('start_date', { ascending: true });

    if (error) throw error;

    return { bookedPeriods: data, error: null };
  } catch (error) {
    console.error("Error in getAvailabilityForDateRange:", error);
    return { bookedPeriods: [], error: error.message || "Failed to fetch availability data." };
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

// --- Performance & Optimization Helpers ---

// Quick summary counts for admin dashboards.
export async function getRentalCountsByStatusForPeriod(adminId, startDate, endDate) {
  try {
    // Using Supabase's.rpc for potential complex aggregations or multiple queries in one go
    // For simplicity here, we'll do separate counts, but a single RPC function could be more efficient.

    // Example using postgrest-js filters and count
    const statusCounts = {
      pending_applications: 0,
      pending_contracts: 0,
      active_rentals: 0,
      // Add other statuses you want to count
    };

    // Count pending applications
    const { count: pendingApps, error: paError } = await supabase
      .from('rentals')
      .select('*', { count: 'exact', head: true })
      .eq('admin_id', adminId)
      .eq('application_status', 'pending')
      .lte('start_date', endDate)
      .gte('end_date', startDate);

    if (paError) throw paError;
    statusCounts.pending_applications = pendingApps;

    // Count pending contracts
    const { count: pendingContracts, error: pcError } = await supabase
      .from('rentals')
      .select('*', { count: 'exact', head: true })
      .eq('admin_id', adminId)
      .eq('contract_status', 'pending')
      .lte('start_date', endDate)
      .gte('end_date', startDate);

    if (pcError) throw pcError;
    statusCounts.pending_contracts = pendingContracts;

    // Count active rentals
    const { count: activeRentals, error: arError } = await supabase
      .from('rentals')
      .select('*', { count: 'exact', head: true })
      .eq('admin_id', adminId)
      .eq('rental_status', 'active')
      .lte('start_date', endDate)
      .gte('end_date', startDate);

    if (arError) throw arError;
    statusCounts.active_rentals = activeRentals;

    return { counts: statusCounts, error: null };
  } catch (error) {
    console.error("Error in getRentalCountsByStatusForPeriod:", error);
    // Return partial counts or empty counts with error?
    return { counts: { pending_applications: 0, pending_contracts: 0, active_rentals: 0 }, error: error.message || "Failed to fetch rental counts." };
  }
}

// Placeholder for future materialized view functions (if implemented)
// export async function refreshAdminCalendarView() { ... }
// export async function getAdminCalendarViewFromMaterialized(...) { ... }