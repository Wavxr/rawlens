// services/pdfService.js
import { PDFDocument, rgb } from 'pdf-lib';
import { supabase } from '../lib/supabaseClient';

// Fetches the base PDF contract template from the public directory
async function fetchContractTemplate() {
  try {
    const templateResponse = await fetch('/RawLens Camera Agreement.pdf');
    if (!templateResponse.ok) {
      throw new Error(`Failed to fetch contract template. Status: ${templateResponse.status}`);
    }
    return await templateResponse.arrayBuffer();
  } catch (error) {
    throw new Error("Could not load the contract template. Please try again later.");
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
export async function uploadContractPdf(pdfBytes, fileName) {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData?.user;
    if (authError || !user) {
      throw new Error("Authentication error. Please log in.");
    }

    const filePath = `users/${user.id}/${fileName}`;

    const { data: uploadData, error } = await supabase.storage
      .from('contracts')
      .upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (error) {
      throw new Error(`Failed to upload contract: ${error.message}`);
    }
    return { success: true, filePath: filePath };
  } catch (error) {
    throw new Error(`Contract upload failed: ${error.message}`);
  }
}

// Generates a temporary signed URL for viewing/downloading a contract PDF from Supabase Storage
export async function getSignedContractUrl(filePath) {
    try {
        const { data, error } = await supabase.storage
            .from('contracts')
            .createSignedUrl(filePath, 3600);

        if (error) {
            if (error.message.includes('not found') || error.message.includes('Object not found')) {
                 throw new Error("Contract file not found.");
            } else if (error.message.includes('Unauthorized') || error.message.includes('Permission denied')) {
                 throw new Error("You do not have permission to access this contract.");
            } else {
                 throw new Error(`Failed to generate access link for contract: ${error.message}`);
            }
        }

        if (!data || !data.signedUrl) {
             throw new Error("Failed to generate access link for contract: Invalid response from server.");
        }

        return data.signedUrl;
    } catch (error) {
        throw error;
    }
}