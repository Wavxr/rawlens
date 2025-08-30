import { supabase } from '../lib/supabaseClient';
import { uploadFile, objectPath, getSignedUrl } from './storageService';

/**
 * Upload payment receipt for a confirmed rental
 */
export async function uploadPaymentReceipt(rentalId, file) {
  try {
    // Generate unique path for receipt
    const fileExt = file.name.split('.').pop();
    const filePath = objectPath(rentalId, 'payment-receipt', fileExt);
    
    // Upload file to storage
    const uploadedPath = await uploadFile('payment-receipts', filePath, file);
    
    // Get signed URL for the uploaded file (since bucket is private)
    const signedUrl = await getSignedUrl('payment-receipts', uploadedPath, { expiresIn: 3600 * 24 * 7 }); // 7 days
    
    // Update rental with receipt URL and payment status
    const { data, error } = await supabase
      .from('rentals')
      .update({
        payment_receipt_url: signedUrl,
        payment_status: 'submitted'
      })
      .eq('id', rentalId)
      .select()
      .single();
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Error uploading payment receipt:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Admin verifies payment receipt
 */
export async function adminVerifyPayment(rentalId) {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .update({
        payment_status: 'verified'
      })
      .eq('id', rentalId)
      .select()
      .single();
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Error verifying payment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Admin rejects payment receipt
 */
export async function adminRejectPayment(rentalId, reason) {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .update({
        payment_status: 'rejected',
        rejection_reason: reason
      })
      .eq('id', rentalId)
      .select()
      .single();
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Error rejecting payment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get rentals pending payment verification
 */
export async function getRentalsAwaitingPayment() {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .select(`
        *,
        cameras (*),
        users!rentals_user_id_fkey (id, first_name, last_name, email)
      `)
      .eq('rental_status', 'confirmed')
      .eq('payment_status', 'submitted')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching rentals awaiting payment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a fresh signed URL for payment receipt (for displaying images)
 */
export async function getPaymentReceiptUrl(rentalId) {
  try {
    // Get the rental record to find the original file path
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .select('payment_receipt_url')
      .eq('id', rentalId)
      .single();
    
    if (rentalError) throw rentalError;
    
    if (!rental.payment_receipt_url) {
      return { success: false, error: 'No payment receipt found' };
    }
    
    // Extract the file path from the existing URL
    // The URL format is typically: .../storage/v1/object/sign/bucket/path?token=...
    // We need to extract the path part
    const urlParts = rental.payment_receipt_url.split('/payment-receipts/');
    if (urlParts.length < 2) {
      return { success: false, error: 'Invalid receipt URL format' };
    }
    
    const filePath = urlParts[1].split('?')[0]; // Remove query params
    const fullPath = `${rentalId}/${filePath.split('/').pop()}`; // Reconstruct path
    
    // Generate fresh signed URL
    const signedUrl = await getSignedUrl('payment-receipts', fullPath, { expiresIn: 3600 * 24 }); // 24 hours
    
    return { success: true, url: signedUrl };
  } catch (error) {
    console.error('Error getting payment receipt URL:', error);
    return { success: false, error: error.message };
  }
}
