import { useState, useRef } from "react";
import { createUserRentalRequest } from "../services/rentalService";
import { generateSignedContractPdf, uploadContractPdf, getSignedContractUrl } from "../services/pdfService";
import { getUserById } from "../services/userService";
import { isUserVerified } from "../services/verificationService";

const useRentalSubmission = (user) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [submittedRentalData, setSubmittedRentalData] = useState(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [pdfSignedUrl, setPdfSignedUrl] = useState("");

  const sigCanvasRef = useRef();

  // Step 1: open contract modal
  const handleRentNow = () => {
    if (sigCanvasRef.current) sigCanvasRef.current.clear();
    setShowContractModal(true);
    setRequestError("");
  };

  // Step 2: finalize and submit request
  const submitRentalRequest = async (signatureDataUrl, {
    cameraModelName,
    startDate,
    endDate,
  }) => {
    try {
      if (!signatureDataUrl) throw new Error("Please sign the contract before submitting.");

      // Check verification
      const canRent = await isUserVerified(user.id);
      if (!canRent) throw new Error("Your account is not verified. Please complete verification first.");

      // Fetch user info for contract
      let customerName = "User", customerEmail = "", customerContact = "";
      try {
        const userData = await getUserById(user.id);
        customerName = `${userData.first_name || ""} ${userData.last_name || ""}`.trim() || userData.email;
        customerEmail = userData.email;
        customerContact = userData.contact_number || "";
      } catch (err) {
        console.warn("Could not fetch full user data, using defaults.");
        customerEmail = user.email;
      }

      // Generate + upload contract
      const rentalDetails = {
        cameraName: cameraModelName,
        startDate: new Date(startDate).toLocaleDateString(),
        endDate: new Date(endDate).toLocaleDateString(),
        customerName,
      };
      const pdfBytes = await generateSignedContractPdf(signatureDataUrl, rentalDetails);
      const fileName = `contract_${user.id}_${Date.now()}.pdf`;
      const { success, filePath } = await uploadContractPdf(pdfBytes, fileName);
      if (!success || !filePath) throw new Error("Contract upload failed.");

      // Insert rental request (unit assigned inside service)
      setIsSubmitting(true);
      const result = await createUserRentalRequest({
        cameraModelName,
        startDate,
        endDate,
        contractPdfUrl: filePath,
        customerInfo: { name: customerName, contact: customerContact, email: customerEmail },
      });

      if (result.error) throw new Error(result.error);

      setRequestSuccess(true);
      setSubmittedRentalData(result.data);
      setShowContractModal(false);
    } catch (err) {
      setRequestError(err.message || "Failed to submit rental request.");
      setShowContractModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: contract PDF viewer
  const handleViewPdf = async (filePath) => {
    try {
      const url = await getSignedContractUrl(filePath);
      setPdfSignedUrl(url);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setRequestError("Could not open contract.");
    }
  };

  const resetSubmission = () => {
    setIsSubmitting(false);
    setRequestError("");
    setRequestSuccess(false);
    setSubmittedRentalData(null);
    setShowContractModal(false);
    setPdfSignedUrl("");
  };

  return {
    isSubmitting,
    requestError,
    requestSuccess,
    submittedRentalData,
    showContractModal,
    pdfSignedUrl,
    sigCanvasRef,
    handleRentNow,
    submitRentalRequest,
    handleViewPdf,
    resetSubmission,
    setShowContractModal,
  };
};

export default useRentalSubmission;
