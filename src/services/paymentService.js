import { supabase } from '../lib/supabaseClient';
import { uploadFile, objectPath, getSignedUrl } from './storageService';

// ------------------------------------------
//   --  Generic Functions -- 
// ------------------------------------------

// Get payment details by ID
export async function getPaymentById(paymentId) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        rentals (
          *,
          cameras (*)
        ),
        users (id, first_name, last_name, email, contact_number)
      `)
      .eq('id', paymentId)
      .single();
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

// Upload payment receipt for a payment record
export async function uploadPaymentReceipt(paymentId, rentalId, file) {
  try {
    // Validate payment
    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .select("id, rental_id")
      .eq("id", paymentId)
      .maybeSingle();
    if (payErr || !payment) throw new Error("Payment not found.");

    // Validate rental
    const { data: rental, error: rentErr } = await supabase
      .from("rentals")
      .select("id, user_id")
      .eq("id", rentalId)
      .maybeSingle();
    if (rentErr || !rental) throw new Error("Rental not found.");

    // Generate file path & upload
    const ext = file.name.split(".").pop();
    const filePath = objectPath(rentalId, "payment-receipt", ext);
    const uploadedPath = await uploadFile("payment-receipts", filePath, file);

    // Signed URL (7 days)
    const signedUrl = await getSignedUrl("payment-receipts", uploadedPath, {
      expiresIn: 3600 * 24 * 7,
    });

    // Update payment record
    const { data, error } = await supabase
      .from("payments")
      .update({
        payment_receipt_url: signedUrl,
        payment_status: "submitted",
      })
      .eq("id", paymentId)
      .select()
      .single();
    if (error) throw error;

    return { success: true, data };
  } catch (err) {
    console.error("uploadPaymentReceipt error:", err);
    if (err.status === 403) return { success: false, error: "Access denied." };
    return {
      success: false,
      error: err.message || "Failed to upload receipt.",
    };
  }
}

// Get a fresh signed URL for payment receipt (for displaying images)
export async function getPaymentReceiptUrl(paymentId) {
  try {
    // Get the payment record to find the receipt URL
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('payment_receipt_url')
      .eq('id', paymentId)
      .single();
    
    if (paymentError) throw paymentError;
    
    if (!payment.payment_receipt_url) {
      return { success: false, error: 'No payment receipt found' };
    }
    
    return { success: true, url: payment.payment_receipt_url };
  } catch (error) {
    console.error('Error getting payment receipt URL:', error);
    return { success: false, error: error.message };
  }
}

// ------------------------------------------
//   --  Admin Functions --
// ------------------------------------------

// Create initial rental payment when admin approves rental
export async function adminCreateInitialRentalPayment(rentalId, userId, amount) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        rental_id: rentalId,
        user_id: userId,
        amount: amount,
        payment_type: 'rental',
        payment_status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating initial rental payment:', error);
    return { success: false, error: error.message };
  }
}

// Create extension payment when user requests extension or admin extends
export async function adminCreateExtensionPayment(extensionId, rentalId, userId, amount, paymentFile = null) {
  try {
    let paymentReceiptUrl = null;

    // Upload payment file if provided
    if (paymentFile) {
      const fileExt = paymentFile.name.split('.').pop();
      const fileName = `extension_${extensionId}_${Date.now()}.${fileExt}`;
      const filePath = `payments/extensions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(filePath, paymentFile);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(filePath);

      paymentReceiptUrl = publicUrl;
    }

    const { data, error } = await supabase
      .from('payments')
      .insert({
        rental_id: rentalId,
        extension_id: extensionId,
        user_id: userId,
        amount: amount,
        payment_type: 'extension',
        payment_status: paymentFile ? 'submitted' : 'pending',
        payment_receipt_url: paymentReceiptUrl
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating extension payment:', error);
    return { success: false, error: error.message };
  }
}

// Verify rental payment and update rental status
export async function adminVerifyRentalPayment(paymentId) {
  try {
    // Update payment status to verified
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .update({ payment_status: 'verified' })
      .eq('id', paymentId)
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Update rental status to confirmed (ready for shipping)
    const { error: rentalError } = await supabase
      .from('rentals')
      .update({ rental_status: 'confirmed' })
      .eq('id', payment.rental_id);

    if (rentalError) throw rentalError;

    return { success: true, data: payment };
  } catch (error) {
    console.error('Error verifying rental payment:', error);
    return { success: false, error: error.message };
  }
}

// Verify extension payment and update rental end date
export async function adminVerifyExtensionPayment(paymentId) {
  try {
    // Update payment status to verified
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .update({ payment_status: 'verified' })
      .eq('id', paymentId)
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Get extension details
    const { data: extension, error: extensionError } = await supabase
      .from('rental_extensions')
      .select('requested_end_date')
      .eq('id', payment.extension_id)
      .single();

    if (extensionError) throw extensionError;

    // Update rental end date
    const { error: rentalError } = await supabase
      .from('rentals')
      .update({ end_date: extension.requested_end_date })
      .eq('id', payment.rental_id);

    if (rentalError) throw rentalError;

    return { success: true, data: payment };
  } catch (error) {
    console.error('Error verifying extension payment:', error);
    return { success: false, error: error.message };
  }
}

// Get all submitted payments for admin review
export async function adminGetSubmittedPayments() {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        rentals (
          *,
          cameras (*)
        ),
        users (id, first_name, last_name, email, contact_number)
      `)
      .eq('payment_status', 'submitted')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error getting submitted payments:', error);
    return { success: false, error: error.message };
  }
}

// ------------------------------------------
//   --  User Functions --
// ------------------------------------------

// Update payment status when user makes payment
export async function userUpdatePaymentStatus(paymentId, status, reference = null) {
  try {
    const updates = { payment_status: status };
    if (reference) {
      updates.payment_reference = reference;
    }

    const { data, error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating payment status:', error);
    return { success: false, error: error.message };
  }
}

// Get user's payment history
export async function userGetPaymentHistory(userId) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        rentals (id, start_date, end_date, camera_id, cameras (name)),
        rental_extensions (id, original_end_date, requested_end_date)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error getting user payment history:', error);
    return { success: false, error: error.message };
  }
}