// src/services/feedbackService.js
import { supabase } from "../lib/supabaseClient";

/**
 * Get feedback for a specific rental.
 * Returns null if no feedback exists (e.g., user skipped).
 */
export async function getRentalFeedback(rentalId) {
  const { data, error } = await supabase
    .from('rental_feedback')
    .select('*')
    .eq('rental_id', rentalId)
    .limit(1);

  if (error) throw error;

  return data?.[0] || null;
}

/**
 * Submit feedback for a rental.
 * Both rating and feedback are optional.
 * Only allowed if rental_status = 'active' or 'completed' (enforced by RLS).
 */
export async function submitRentalFeedback({ rentalId, userId, rating = null, feedback = null }) {
  // Ensure at least one of rating or feedback is provided
  if (rating === null && !feedback) {
    throw new Error("Please provide a rating, feedback, or both.");
  }

  const { data, error } = await supabase
    .from("rental_feedback")
    .insert([{ rental_id: rentalId, user_id: userId, rating, feedback }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Admin: fetch all feedback with user + rental + camera info
export async function getAllFeedbacks() {
  const { data, error } = await supabase
    .from("rental_feedback")
    .select(`
      id,
      rating,
      feedback,
      created_at,
      rentals (
        id,
        user_id,
        rental_status,
        cameras (
          id,
          name
        ),
        users (
          id,
          first_name,
          last_name,
          email
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}


/**
 * Optional helper: Get all rentals with their feedback (for user dashboard)
 * Returns an array of rentals with a nested rental_feedback object (null if skipped)
 */
export async function getRentalsWithFeedback(userId) {
  const { data, error } = await supabase
    .from("rentals")
    .select(`
      *,
      rental_feedback(id, rating, feedback, created_at)
    `)
    .eq("user_id", userId)
    .order("start_date", { ascending: false });

  if (error) throw error;
  return data;
}
