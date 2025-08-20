// src/services/feedbackService.js
import { supabase } from "../lib/supabaseClient";

/**
 * Get feedback for a specific rental.
 * Returns null if no feedback exists (e.g., user skipped).
 */
export async function getRentalFeedback(rentalId) {
  const { data, error } = await supabase
    .from("rental_feedback")
    .select("id, rating, feedback, created_at, user_id")
    .eq("rental_id", rentalId)
    .single(); // returns null if skipped

  if (error) throw error;
  return data; // null if no feedback
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

/**
 * Get all feedbacks (admin only).
 */
export async function getAllFeedbacks() {
  const { data, error } = await supabase
    .from("rental_feedback")
    .select("id, rental_id, user_id, rating, feedback, created_at");

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
