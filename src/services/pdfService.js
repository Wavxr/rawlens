import { PDFDocument, rgb } from 'pdf-lib';
import { supabase } from '../lib/supabaseClient';
import { objectPath, uploadFile, getSignedUrl } from './storageService';

// ------------------------------------------------------------
// Contract Storage Path Builder (user + admin scopes)
// Patterns (no intermediate folder before rentalId):
//   User  -> users/<rentalId>/<userId>
//   Admin -> admin/<rentalId>/<sanitized-customer-name>
// ------------------------------------------------------------
function buildContractBasePath({
  scope,
  rentalId,
  userId,
  customerName = null,
}) {
  if (!rentalId) throw new Error('rentalId is required for contract path');

  // Sanitize customer name for admin paths
  const safeCustomer = customerName
    ? customerName.replace(/[^a-z0-9_-]/gi, '-').toLowerCase()
    : 'unknown';

  // User scope paths include userId for RLS security
  if (scope === 'user') {
    if (!userId) throw new Error('userId is required for user contract path');
    return `user/contract/${rentalId}/${userId}`;
  }

  // Admin scope paths use customer name instead of userId
  if (scope === 'admin') {
    return `admin/contract/${rentalId}/${safeCustomer}`;
  }

  throw new Error(`Unsupported scope "${scope}" for contract path`);
}

// Fetches the base PDF contract template from the public directory
async function fetchContractTemplate() {
  try {
    const templateResponse = await fetch('/RawLens Camera Agreement.pdf');
    if (!templateResponse.ok) {
      throw new Error(`Failed to fetch contract template. Status: ${templateResponse.status}`);
    }
    return await templateResponse.arrayBuffer();
  } catch (error) {
    throw new Error("Could not load the contract template. Please try again later. ", error);
  }
}

// Generates a signed PDF by embedding signature and rental details into the template
export async function generateSignedContractPdf(signatureDataUrl, rentalDetails) {
  try {
    if (!signatureDataUrl || !rentalDetails) {
        throw new Error("Signature data and rental details are required.");
    }

    const templateBytes = await fetchContractTemplate();
    const pdfDoc = await PDFDocument.load(templateBytes);

    const signatureImageBytes = dataURLtoUint8Array(signatureDataUrl);
    let signatureImage;
    if (signatureDataUrl.startsWith('data:image/png')) {
      signatureImage = await pdfDoc.embedPng(signatureImageBytes);
    } else if (signatureDataUrl.startsWith('image/jpeg')) {
      signatureImage = await pdfDoc.embedJpg(signatureImageBytes);
    } else {
      throw new Error('Unsupported signature image format. Please use PNG or JPEG.');
    }

    const pages = pdfDoc.getPages();
    if (pages.length < 3) {
        throw new Error("Contract template must have at least 3 pages.");
    }
    const page1 = pages[0];
    const page3 = pages[2];

    const { cameraName, startDate, endDate, customerName } = rentalDetails;
    const formattedStartDate = startDate;
    const formattedEndDate = endDate;

    if (customerName) {
        page1.drawText(customerName, { x: 95, y: 665, size: 12, color: rgb(0, 0, 0) });
    }

    if (cameraName) {
        page3.drawText(cameraName, { x: 410, y: 360, size: 12, color: rgb(0, 0, 0) });
    }
    if (formattedStartDate) {
        page3.drawText(formattedStartDate, { x: 400, y: 435, size: 12, color: rgb(0, 0, 0) });
    }
    if (formattedEndDate) {
        page3.drawText(formattedEndDate, { x: 470, y: 435, size: 12, color: rgb(0, 0, 0) });
    }

    page3.drawImage(signatureImage, {
      x: 140,
      y: 440,
      width: 200,
      height: 50,
    });

    if (customerName) {
        page3.drawText(customerName, {
        x: 160,
        y: 432,
        size: 12,
        color: rgb(0, 0, 0)
        });
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;

  } catch (error) {
    throw new Error(`Failed to generate the signed contract PDF: ${error.message}`);
  }
}

// Converts a data URL string (e.g., from canvas) to a Uint8Array for PDF embedding
function dataURLtoUint8Array(dataUrl) {
  if (!dataUrl.startsWith('')) {
      throw new Error('Expected a data URL string.');
  }
  let byteString;
  if (dataUrl.split(',')[0].indexOf('base64') >= 0) {
    byteString = atob(dataUrl.split(',')[1]);
  } else {
    byteString = unescape(dataUrl.split(',')[1]);
  }
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return ia;
}

// Uploads a generated PDF byte array to Supabase Storage under the user's directory
export async function uploadContractPdf(pdfBytes, rentalId, { scope = 'user', customerName = null } = {}) {
  try {
    if (!rentalId) throw new Error('rentalId is required to upload contract');
    if (!pdfBytes) throw new Error('pdfBytes are required');

    // Ensure uploader is authenticated (RLS context)
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) throw new Error('Authentication error. Please log in.');
    const actingUserId = authData.user.id;

    let effectiveCustomerName = customerName;
    if (scope === 'admin' && !effectiveCustomerName) {
      // Fetch rental to get customer_name if not provided
      const { data: rentalRow, error: rentalErr } = await supabase
        .from('rentals')
        .select('id, customer_name')
        .eq('id', rentalId)
        .maybeSingle();
      if (rentalErr) throw new Error(`Failed to fetch rental for contract path: ${rentalErr.message}`);
      effectiveCustomerName = rentalRow?.customer_name || 'unknown';
    }

    const basePath = buildContractBasePath({
      scope,
      rentalId,
      userId: actingUserId,
      customerName: effectiveCustomerName
    });

    // Versioned contract file name
    const path = objectPath(basePath, 'contract', 'pdf');

    // Convert raw pdf bytes (Uint8Array) to a Blob so storage helper can infer contentType
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    await uploadFile('contracts', path, blob);
    return { success: true, filePath: path };
  } catch (error) {
    throw new Error(`Contract upload failed: ${error.message}`);
  }
}

// Delete a contract file by its storage path (no DB update side-effects)
export async function deleteContractFile(filePath, rentalId) {
  try {
    if (!filePath) throw new Error('filePath is required');
    if (!rentalId) throw new Error('rentalId is required');

    // Attempt storage removal (non-fatal if already gone)
    const { error: storageErr } = await supabase.storage.from('contracts').remove([filePath]);
    if (storageErr && !/not found/i.test(storageErr.message)) {
      throw storageErr; // real error other than missing object
    }

    // Clear the contract path only if it matches current row to avoid racing overwrites
    const { data: updatedRental, error: updateErr } = await supabase
      .from('rentals')
      .update({ contract_pdf_url: null })
      .eq('id', rentalId)
      .eq('contract_pdf_url', filePath)
      .select('id, contract_pdf_url')
      .maybeSingle();
    if (updateErr) throw updateErr;

    return { success: true, rental: updatedRental };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to delete contract file' };
  }
}

// Generates a temporary signed URL for viewing/downloading a contract PDF
export async function getSignedContractUrl(filePath) {
  try {
    const signedUrl = await getSignedUrl('contracts', filePath, { expiresIn: 3600 });
    if (!signedUrl) {
      throw new Error('Failed to generate access link for contract: Invalid response from server.');
    }
    return signedUrl;
  } catch (error) {
    const message = error.message || '';

    if (message.includes('not found') || message.includes('Object not found')) {
      throw new Error('Contract file not found.');
    }
    if (message.includes('Unauthorized') || message.includes('Permission denied')) {
      throw new Error('You do not have permission to access this contract.');
    }

    throw new Error(`Failed to generate access link for contract: ${message}`);
  }
}
