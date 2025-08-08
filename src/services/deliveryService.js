import { supabase } from "../lib/supabaseClient";

// Helper to fetch a single rental by id
async function fetchRentalById(rentalId) {
  const { data, error } = await supabase
    .from("rentals")
    .select("*")
    .eq("id", rentalId)
    .single();
  return { rental: data || null, error };
}

// Helper to assert the current authenticated user matches provided id
async function assertCurrentUserMatches(expectedUserId) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    throw new Error("Authentication error. Please log in.");
  }
  if (authData.user.id !== expectedUserId) {
    throw new Error("Not authorized for this action.");
  }
  return authData.user;
}

// Admin: camera packed and ready for pickup
export async function adminReadyCamera(rentalId, adminId) {
  try {
    await assertCurrentUserMatches(adminId);

    const { data, error } = await supabase
      .from("rentals")
      .update({
        shipping_status: "ready_to_ship",
      })
      .eq("id", rentalId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, updatedRental: data };
  } catch (error) {
    console.error("Error in adminReadyCamera:", error);
    return { success: false, error: error.message || "Failed to mark ready to ship." };
  }
}

// Admin: Lalamove picked up for delivery to user
export async function adminTransitToUser(rentalId, adminId) {
  try {
    await assertCurrentUserMatches(adminId);

    const { data, error } = await supabase
      .from("rentals")
      .update({
        shipping_status: "in_transit_to_user",
      })
      .eq("id", rentalId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, updatedRental: data };
  } catch (error) {
    console.error("Error in adminTransitToUser:", error);
    return { success: false, error: error.message || "Failed to mark in transit to user." };
  }
}

// User: confirms they received the item
export async function userConfirmDelivered(rentalId, userId) {
  try {
    const currentUser = await assertCurrentUserMatches(userId);

    const { rental, error: fetchError } = await fetchRentalById(rentalId);
    if (fetchError || !rental) {
      throw new Error("Rental not found.");
    }
    if (rental.user_id !== currentUser.id) {
      throw new Error("Not authorized to confirm delivery for this rental.");
    }

    const { data, error } = await supabase
      .from("rentals")
      .update({
        shipping_status: "delivered",
        rental_status: "active",
      })
      .eq("id", rentalId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, updatedRental: data };
  } catch (error) {
    console.error("Error in userConfirmDelivered:", error);
    return { success: false, error: error.message || "Failed to confirm delivered." };
  }
}

// System: schedule return after end date has passed
export async function scheduleAutomaticReturn(rentalId) {
  try {
    const { rental, error: fetchError } = await fetchRentalById(rentalId);
    if (fetchError || !rental) {
      throw new Error("Rental not found.");
    }

    const now = new Date();
    const endDate = new Date(rental.end_date);
    const isActive = rental.rental_status === "active";
    const endDatePassed = !isNaN(endDate.getTime()) && endDate < now;

    if (isActive && endDatePassed && rental.shipping_status !== "return_scheduled") {
      const { data, error } = await supabase
        .from("rentals")
        .update({
          shipping_status: "return_scheduled",
        })
        .eq("id", rentalId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, updatedRental: data };
    }

    // Nothing to update; return success for idempotency/logging
    return { success: true, updatedRental: null };
  } catch (error) {
    console.error("Error in scheduleAutomaticReturn:", error);
    return { success: false, error: error.message || "Failed to schedule automatic return." };
  }
}

// User: confirms they sent the item back
export async function userConfirmSentBack(rentalId, userId) {
  try {
    const currentUser = await assertCurrentUserMatches(userId);

    const { rental, error: fetchError } = await fetchRentalById(rentalId);
    if (fetchError || !rental) {
      throw new Error("Rental not found.");
    }
    if (rental.user_id !== currentUser.id) {
      throw new Error("Not authorized to confirm return for this rental.");
    }

    const { data, error } = await supabase
      .from("rentals")
      .update({
        shipping_status: "in_transit_to_owner",
      })
      .eq("id", rentalId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, updatedRental: data };
  } catch (error) {
    console.error("Error in userConfirmSentBack:", error);
    return { success: false, error: error.message || "Failed to confirm item sent back." };
  }
}

// Admin: confirms the item is returned to owner; completes rental
export async function adminConfirmReturned(rentalId, adminId) {
  try {
    await assertCurrentUserMatches(adminId);

    const { data, error } = await supabase
      .from("rentals")
      .update({
        shipping_status: "returned",
        rental_status: "completed",
      })
      .eq("id", rentalId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, updatedRental: data };
  } catch (error) {
    console.error("Error in adminConfirmReturned:", error);
    return { success: false, error: error.message || "Failed to confirm returned." };
  }
}


