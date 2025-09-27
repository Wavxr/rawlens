import { supabase } from '../lib/supabaseClient';
import { uploadFile, objectPath, getSignedUrl } from './storageService';

// ------------------------------------------
//   --  Generic Functions -- 
// ------------------------------------------

// Create a new payment record
export async function createPayment({ rentalId, extensionId = null, userId, amount, type }) {
  const { data, error } = await supabase
    .from("payments")
    .insert({
      rental_id: rentalId,
      extension_id: extensionId,
      user_id: userId,
      amount,
      payment_type: type,
      payment_status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}


// Get payment details by ID
export async function getPaymentById(paymentId) {
  try {
    const { data: payment, error } = await supabase
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
    
    if (error) return { data: null, error };

    // If it's an extension payment, fetch the extension data separately
    if (payment.payment_type === 'extension' && payment.extension_id) {
      const { data: extension, error: extensionError } = await supabase
        .from('rental_extensions')
        .select('id, extension_status, requested_end_date, original_end_date')
        .eq('id', payment.extension_id)
        .single();

      if (!extensionError && extension) {
        payment.rental_extensions = extension;
      }
    }

    return { data: payment, error: null };
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
    console.log("Uploading to path:", filePath);
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
    const data = await createPayment({
      rentalId,
      userId,
      amount,
      type: 'rental',
    });
    return { success: true, data };
  } catch (error) {
    console.error('Error creating initial rental payment:', error);
    return { success: false, error: error.message };
  }
}

// Verify rental payment and update rental status
export async function adminVerifyRentalPayment(paymentId) {
  try {
    // First, get the payment with rental details to check status
    const { data: paymentWithRental, error: fetchError } = await supabase
      .from('payments')
      .select(`
        *,
        rentals!inner (
          id,
          rental_status
        )
      `)
      .eq('id', paymentId)
      .single();

    if (fetchError) throw fetchError;

    // Check if rental is approved (confirmed status)
    if (paymentWithRental.rentals.rental_status !== 'confirmed') {
      throw new Error(`Rental must be approved first. Current status: ${paymentWithRental.rentals.rental_status}`);
    }

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
    // First, get the payment details
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError) throw fetchError;

    // Check if it's an extension payment
    if (payment.payment_type !== 'extension' || !payment.extension_id) {
      throw new Error('Payment is not associated with an extension');
    }

    // Get extension details separately
    const { data: extension, error: extensionError } = await supabase
      .from('rental_extensions')
      .select('id, extension_status, requested_end_date')
      .eq('id', payment.extension_id)
      .single();

    if (extensionError) throw extensionError;

    // Check if extension is approved
    if (extension.extension_status !== 'approved') {
      throw new Error(`Extension must be approved first. Current status: ${extension.extension_status}`);
    }

    // Update payment status to verified
    const { data: updatedPayment, error: paymentError } = await supabase
      .from('payments')
      .update({ payment_status: 'verified' })
      .eq('id', paymentId)
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Update rental end date
    const { error: rentalError } = await supabase
      .from('rentals')
      .update({ end_date: extension.requested_end_date })
      .eq('id', payment.rental_id);

    if (rentalError) throw rentalError;

    return { success: true, data: updatedPayment };
  } catch (error) {
    console.error('Error verifying extension payment:', error);
    return { success: false, error: error.message };
  }
}

// Get all submitted payments for admin review
export async function adminGetSubmittedPayments() {
  try {
    // First get the payments
    const { data: paymentsData, error: paymentsError } = await supabase
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

    if (paymentsError) throw paymentsError;

    // Then get extension data for extension payments
    const extensionPayments = paymentsData.filter(p => p.payment_type === 'extension' && p.extension_id);
    
    if (extensionPayments.length > 0) {
      const extensionIds = extensionPayments.map(p => p.extension_id);
      const { data: extensionsData, error: extensionsError } = await supabase
        .from('rental_extensions')
        .select('id, extension_status, requested_end_date, original_end_date')
        .in('id', extensionIds);

      if (extensionsError) throw extensionsError;

      // Attach extension data to payments
      const paymentsWithExtensions = paymentsData.map(payment => {
        if (payment.payment_type === 'extension' && payment.extension_id) {
          const extension = extensionsData.find(ext => ext.id === payment.extension_id);
          return { ...payment, rental_extensions: extension };
        }
        return payment;
      });

      return { success: true, data: paymentsWithExtensions };
    }

    return { success: true, data: paymentsData };
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