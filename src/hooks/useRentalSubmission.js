import { useState, useRef } from 'react';
import { createUserRentalRequest, updateRentalContractUrl } from '../services/rentalService';
import { generateSignedContractPdf, uploadContractPdf, getSignedContractUrl } from '../services/pdfService';
import { isUserVerified } from '../services/verificationService';

const useRentalSubmission = (user) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [submittedRentalData, setSubmittedRentalData] = useState(null);

  const [showContractModal, setShowContractModal] = useState(false);
  const [pdfSignedUrl, setPdfSignedUrl] = useState('');
  const [isGeneratingPdfUrl, setIsGeneratingPdfUrl] = useState(false);
  const [pdfViewError, setPdfViewError] = useState('');

  const sigCanvasRef = useRef();

  /** Step 1: User clicks "Rent Now" → show contract modal */
  const handleRentNow = () => {
    if (isSubmitting) return;
    if (sigCanvasRef.current) sigCanvasRef.current.clear();
    setShowContractModal(true);
    setRequestError('');
  };

  const submitRentalRequest = async (signatureDataUrl, {
  selectedCameraUnitId,
  cameraModelName,
  startDate,
  endDate,
  calculatedPrice
}) => {
  if (!signatureDataUrl) {
    setRequestError("Signature is required.");
    setShowContractModal(true);
    return;
  }

  try {
    setIsSubmitting(true);
    setRequestError('');

    console.time("⏱ Total rental submission");

    // 1. Verify user
    console.time("⏱ User verification");
    const canRent = await isUserVerified(user.id);
    console.timeEnd("⏱ User verification");

    if (!canRent) {
      throw new Error("Your account is not verified. Please complete verification in your Profile.");
    }

    // 2. Create rental
    console.time("⏱ Rental creation");
    const { data: rentalData, error } = await createUserRentalRequest({
      cameraId: selectedCameraUnitId,
      startDate,
      endDate,
      contractPdfUrl: null, // temp
      customerInfo: {
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        contact: user.contact_number || '',
        email: user.email,
      },
      total_price: calculatedPrice.total,
    });
    console.timeEnd("⏱ Rental creation");

    if (error) throw new Error(error.message || "Failed to submit rental request.");
    setSubmittedRentalData(rentalData);
    setRequestSuccess(true);
    setShowContractModal(false);

    // 3. Background: generate + upload contract
    (async () => {
      console.time("⏱ Contract generation & upload");
      try {
        const rentalDetails = {
          cameraName: cameraModelName,
          startDate: new Date(startDate).toLocaleDateString(),
          endDate: new Date(endDate).toLocaleDateString(),
          customerName: user.first_name || user.email || "User",
        };

        console.time("⏱ Generate PDF");
        const pdfBytes = await generateSignedContractPdf(signatureDataUrl, rentalDetails);
        console.timeEnd("⏱ Generate PDF");

        console.time("⏱ Upload PDF");
        const fileName = `contract_${selectedCameraUnitId}_${Date.now()}.pdf`;
        const { success, filePath } = await uploadContractPdf(pdfBytes, fileName);
        console.timeEnd("⏱ Upload PDF");

        if (success && filePath) {
          console.time("⏱ Update rental row with PDF URL");
          const updateResult = await updateRentalContractUrl(rentalData.id, filePath);
          console.timeEnd("⏱ Update rental row with PDF URL");

          if (updateResult.success) {
            setSubmittedRentalData((prev) => ({ ...prev, contract_pdf_url: filePath }));
          } else {
            console.warn("Failed to update rental with contract URL:", updateResult.error);
          }
        }
      } catch (bgErr) {
        console.error("Background contract upload failed:", bgErr);
      } finally {
        console.timeEnd("⏱ Contract generation & upload");
      }
    })();

    console.timeEnd("⏱ Total rental submission");

  } catch (err) {
    setRequestError(err.message || "Could not submit rental request.");
    setShowContractModal(true);
    console.timeEnd("⏱ Total rental submission");
  } finally {
    setIsSubmitting(false);
  }
};

  /** View contract PDF */
  const handleViewPdf = async (contractFilePath) => {
    if (!contractFilePath) {
      setPdfViewError("No contract file available.");
      return;
    }
    setIsGeneratingPdfUrl(true);
    setPdfViewError('');
    setPdfSignedUrl('');
    try {
      const signedUrl = await getSignedContractUrl(contractFilePath);
      setPdfSignedUrl(signedUrl);
    } catch (err) {
      setPdfViewError(err.message || "Could not generate link.");
    } finally {
      setIsGeneratingPdfUrl(false);
    }
  };

  const handleOpenPdfInNewTab = () => {
    if (pdfSignedUrl) {
      window.open(pdfSignedUrl, '_blank', 'noopener,noreferrer');
    } else if (submittedRentalData?.contract_pdf_url) {
      handleViewPdf(submittedRentalData.contract_pdf_url);
    }
  };

  return {
    isSubmitting,
    requestError,
    requestSuccess,
    submittedRentalData,
    showContractModal,
    pdfSignedUrl,
    isGeneratingPdfUrl,
    pdfViewError,
    sigCanvasRef,
    handleRentNow,
    submitRentalRequest,
    handleViewPdf,
    handleOpenPdfInNewTab,
    setShowContractModal,
  };
};

export default useRentalSubmission;
