import { useState, useRef } from 'react';
import { checkCameraAvailability, createUserRentalRequest } from '../services/rentalService';
import { generateSignedContractPdf, uploadContractPdf, getSignedContractUrl } from '../services/pdfService';
import { getUserById } from '../services/userService';
import { isUserVerified } from '../services/verificationService';

const useRentalSubmission = (user) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [submittedRentalData, setSubmittedRentalData] = useState(null);
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [pdfSignedUrl, setPdfSignedUrl] = useState('');
  const [isGeneratingPdfUrl, setIsGeneratingPdfUrl] = useState(false);
  const [pdfViewError, setPdfViewError] = useState('');

  const sigCanvasRef = useRef();

  const handleRentNow = async (isAvailable, isAvailabilityChecked, calculatedPrice) => {
    if (!isAvailable || !isAvailabilityChecked || !calculatedPrice || isSubmitting || isGeneratingContract) {
      setRequestError("Please confirm availability and price before renting.");
      return;
    }

    // Show contract modal for signature
    setSignatureDataUrl(null);
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
    }
    setShowContractModal(true);
    setRequestError('');
  };

  const submitRentalRequest = async (signatureDataUrlFromModal, {
    selectedCameraUnitId,
    cameraModelName,
    startDate,
    endDate,
    calculatedPrice
  }) => {
    if (!signatureDataUrlFromModal) {
      setRequestError("Signature data is missing.");
      setShowContractModal(true);
      return;
    }

    // Safety: re-check verification right before submitting
    try {
      const canRent = await isUserVerified(user.id);
      if (!canRent) {
        setRequestError("Your account is not verified. Please complete verification in your Profile before renting.");
        return;
      }
    } catch (e) {
      setRequestError(e.message || "Unable to verify your account status.");
      return;
    }

    if (!cameraModelName || !selectedCameraUnitId || !calculatedPrice) {
      setRequestError("Missing required information (camera model, available unit, dates, price, or signature).");
      return;
    }

    setRequestError('');
    setIsGeneratingContract(true);
    setShowContractModal(false);

    try {
      // Perform a final availability check on the specific unit we found
      const { isAvailable: finalCheck } = await checkCameraAvailability(selectedCameraUnitId, startDate, endDate);
      if (!finalCheck) {
        throw new Error("The selected camera unit is no longer available. Please check availability again.");
      }

      let customerName = "User";
      let customerEmail = "user_email_placeholder";
      let customerContact = "user_contact_placeholder";

      try {
        if (user) {
          const userData = await getUserById(user.id);
          customerName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email || "User";
          customerEmail = userData.email || "user_email_placeholder";
          customerContact = userData.contact_number || "user_contact_placeholder";
        }
      } catch (userFetchError) {
        console.error("Error fetching user ", userFetchError);
      }

      const rentalDetails = {
        cameraName: cameraModelName,
        startDate: new Date(startDate).toLocaleDateString(),
        endDate: new Date(endDate).toLocaleDateString(),
        customerName: customerName,
      };

      const pdfBytes = await generateSignedContractPdf(signatureDataUrlFromModal, rentalDetails);
      const fileName = `contract_${selectedCameraUnitId}_${Date.now()}.pdf`;
      const { success, filePath } = await uploadContractPdf(pdfBytes, fileName);

      if (!success || !filePath) {
        throw new Error("Contract upload did not return a valid file path.");
      }

      setIsSubmitting(true);
      const { data: rentalData, error } = await createUserRentalRequest({
        cameraId: selectedCameraUnitId,
        startDate: startDate,
        endDate: endDate,
        contractPdfUrl: filePath,
        customerInfo: {
          name: customerName,
          contact: customerContact,
          email: customerEmail,
        },
        total_price: calculatedPrice.total,
      });

      if (error) throw new Error(error.message || "Failed to submit rental request.");

      setRequestSuccess(true);
      setSubmittedRentalData(rentalData);
      setSignatureDataUrl(null);
      setPdfSignedUrl(null);
      setPdfViewError('');
    } catch (err) {
      setRequestError(err.message || "An error occurred while processing your contract or submitting the request. Please try again.");
      setShowContractModal(true);
    } finally {
      setIsGeneratingContract(false);
      setIsSubmitting(false);
    }
  };

  const handleViewPdf = async (contractFilePath) => {
    if (!contractFilePath) {
      setPdfViewError("Contract file path is missing.");
      return;
    }
    setIsGeneratingPdfUrl(true);
    setPdfViewError('');
    setPdfSignedUrl(null);
    try {
      const signedUrl = await getSignedContractUrl(contractFilePath);
      setPdfSignedUrl(signedUrl);
    } catch (err) {
      setPdfViewError(err.message || "Could not generate link to view/download contract.");
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

  const resetSubmission = () => {
    setIsSubmitting(false);
    setRequestError('');
    setRequestSuccess(false);
    setSubmittedRentalData(null);
    setIsGeneratingContract(false);
    setShowContractModal(false);
    setSignatureDataUrl(null);
    setPdfSignedUrl('');
    setIsGeneratingPdfUrl(false);
    setPdfViewError('');
  };

  return {
    isSubmitting,
    requestError,
    requestSuccess,
    submittedRentalData,
    isGeneratingContract,
    showContractModal,
    signatureDataUrl,
    pdfSignedUrl,
    isGeneratingPdfUrl,
    pdfViewError,
    sigCanvasRef,
    handleRentNow,
    submitRentalRequest,
    handleViewPdf,
    handleOpenPdfInNewTab,
    resetSubmission,
    setShowContractModal,
    setRequestError,
  };
};

export default useRentalSubmission;
