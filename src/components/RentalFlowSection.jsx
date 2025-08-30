// src/components/RentalFlowSection.jsx
import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useCameraStore from '../stores/cameraStore';
import DateFilterInput from './DateFilterInput';
import ContractSigningModal from './ContractSigningModal';
import useAuthStore from '../stores/useAuthStore';
import { Camera, FileText, CheckCircle, AlertCircle, Loader2, ArrowLeft, Eye } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { checkCameraAvailability, createUserRentalRequest, calculateTotalPrice } from '../services/rentalService';
import { findAvailableUnitOfModel } from '../services/cameraService';
import { generateSignedContractPdf, uploadContractPdf, getSignedContractUrl } from '../services/pdfService';
import { getUserById } from '../services/userService';
import { isUserVerified } from '../services/verificationService';

const RentalFlowSection = ({ onBackToBrowse }) => {
  const {
    rentalFlowCamera,
    rentalFlowCameraModelName,
    selectedCameraUnitId,
    startDate,
    endDate,
    isCheckingAvailability,
    isAvailabilityChecked,
    isAvailable,
    availabilityError,
    calculatedPrice,
    isSubmitting,
    requestError,
    requestSuccess,
    showContractModal,
    submittedRentalData,
    isGeneratingContract,
    pdfSignedUrl,
    isGeneratingPdfUrl,
    pdfViewError,
    signatureDataUrl,
    handleRentalFlowDateChange,
    setIsCheckingAvailability,
    setIsAvailabilityChecked,
    setIsAvailable,
    setAvailabilityError,
    setCalculatedPrice,
    setSelectedCameraUnitId,
    setIsSubmitting,
    setRequestError,
    setRequestSuccess,
    setShowContractModal,
    setSubmittedRentalData,
    setIsGeneratingContract,
    setPdfSignedUrl,
    setIsGeneratingPdfUrl,
    setPdfViewError,
    setSignatureDataUrl,
    resetRentalFlowState,
  } = useCameraStore();

  const { user } = useAuthStore();

  const sigCanvasRef = useRef();
  const navigate = useNavigate();

  const calculateAndSetPrice = async (cameraId, start, end) => {
    const startD = new Date(start);
    const endD = new Date(end);
    startD.setHours(0, 0, 0, 0);
    endD.setHours(0, 0, 0, 0);

    if (isNaN(startD.getTime()) || isNaN(endD.getTime()) || endD < startD) {
      setAvailabilityError("Invalid rental period: End date is before start date.");
      return;
    }

    try {
      const { totalPrice, pricePerDay, rentalDays } = await calculateTotalPrice(cameraId, start, end);
      setCalculatedPrice({
        days: rentalDays,
        pricePerDay: pricePerDay,
        total: totalPrice
      });
    } catch (err) {
      console.error("Error in calculateAndSetPrice:", err);
      setAvailabilityError(err.message || "Failed to calculate rental price.");
    }
  };

  const handleCheckAvailability = async () => {
    if ((!rentalFlowCamera && !rentalFlowCameraModelName) || !startDate || !endDate) {
      setAvailabilityError("Please select a camera model and both start and end dates.");
      return;
    }
    
    // Enforce verification before proceeding
    try {
      const canRent = await isUserVerified(user.id);
      if (!canRent) {
        setAvailabilityError("Your account is not verified. Please complete verification in your Profile before renting.");
        return;
      }
    } catch (e) {
      setAvailabilityError(e.message || "Unable to verify your account status. Please try again or check your Profile.");
      return;
    }
    
    const start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
    const end = new Date(new Date(endDate).setHours(0, 0, 0, 0));
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      setAvailabilityError("Please select valid dates. End date must be on or after start date.");
      return;
    }
    
    setAvailabilityError('');
    setIsCheckingAvailability(true);
    setIsAvailabilityChecked(false);
    setIsAvailable(false);
    setSelectedCameraUnitId(null);
    
    try {
      // Use the model name to find an available unit
      const modelName = rentalFlowCameraModelName || rentalFlowCamera?.name;
      if (!modelName) {
        throw new Error("Camera model name not found.");
      }
      
      const { data: availableUnit, error } = await findAvailableUnitOfModel(modelName, startDate, endDate);
      
      if (error) {
        setAvailabilityError(error);
        setIsAvailable(false);
      } else if (availableUnit) {
        setSelectedCameraUnitId(availableUnit.id);
        setIsAvailable(true);
        await calculateAndSetPrice(availableUnit.id, startDate, endDate);
      } else {
        setAvailabilityError(`No units of ${modelName} are available for the selected dates.`);
        setIsAvailable(false);
      }
      
      setIsAvailabilityChecked(true);
    } catch (err) {
      setAvailabilityError(err.message || "An error occurred while checking availability.");
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleSignContract = () => {
    if (isAvailable && isAvailabilityChecked && calculatedPrice && !isSubmitting && !isGeneratingContract) {
        setSignatureDataUrl(null);
        if (sigCanvasRef.current) {
            sigCanvasRef.current.clear();
        }
        setShowContractModal(true);
        setRequestError('');
    } else if (isSubmitting || isGeneratingContract) {
    } else {
        setRequestError("Please confirm availability and price before signing.");
    }
  };

  const handleSubmitRentalRequestWithContract = async (signatureDataUrlFromModal) => {
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
    if (!rentalFlowCameraModelName && !selectedCameraUnitId && !calculatedPrice) {
      setRequestError("Missing required information (camera model, available unit, dates, price, or signature).");
      return;
    }
    if (!isAvailabilityChecked || !isAvailable) {
      setRequestError("Please confirm camera availability first.");
      return;
    }
    setRequestError('');
    setIsGeneratingContract(true);
    setShowContractModal(false);
    try {
      // Perform a final availability check on the specific unit we found
      if (!selectedCameraUnitId) {
        throw new Error("No camera unit selected. Please check availability first.");
      }
      
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
        cameraName: rentalFlowCameraModelName || rentalFlowCamera?.name,
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
        cameraId: selectedCameraUnitId, // Use the specific unit ID we found
        startDate,
        endDate,
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

  const handleStartDateChange = (e) => handleRentalFlowDateChange(e, 'start');
  const handleEndDateChange = (e) => handleRentalFlowDateChange(e, 'end');

  if (!rentalFlowCamera && !rentalFlowCameraModelName) {
      return null;
  }

  // Get display name - prefer model name, fallback to camera name
  const displayCameraName = rentalFlowCameraModelName || rentalFlowCamera?.name || "Unknown Camera";

  return (
    <div className="max-w-4xl mx-auto mb-12">
        <button
            onClick={onBackToBrowse}
            className="mb-6 flex items-center text-blue-600 hover:text-blue-800 font-medium"
        >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Cameras
        </button>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Confirm Your Rental</h2>
                <div className="border border-gray-200 rounded-lg p-5 mb-6 bg-gray-50">
                    <div className="flex flex-col md:flex-row">
                        {rentalFlowCamera.image_url ? (
                            <img
                            src={rentalFlowCamera.image_url}
                            alt={rentalFlowCamera.name}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                            className="w-full md:w-48 h-32 object-cover rounded-lg mb-4 md:mb-0 md:mr-5"
                            />
                        ) : (
                            <div className="w-full md:w-48 h-32 bg-gray-200 rounded-lg mb-4 md:mb-0 md:mr-5 flex items-center justify-center">
                            <Camera className="h-8 w-8 text-gray-400" />
                            </div>
                        )}
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900">{displayCameraName}</h3>
                            <p className="mt-1 text-gray-600">{rentalFlowCamera?.description || "Professional camera equipment"}</p>
                            {rentalFlowCamera?.inclusions && rentalFlowCamera.inclusions.length > 0 && (
                            <div className="mt-3">
                                <h4 className="text-sm font-medium text-gray-700">Includes:</h4>
                                <ul className="mt-1 grid grid-cols-2 gap-1 text-xs text-gray-600">
                                {rentalFlowCamera.inclusions.slice(0, 4).map((inclusion) => (
                                    <li key={`${inclusion.inclusion_item_id}-${inclusion.inclusion_items?.id}`} className="flex items-start">
                                    <span className="mr-1">•</span>
                                    <span>
                                        {inclusion.inclusion_items?.name}
                                        {inclusion.quantity > 1 ? ` (x${inclusion.quantity})` : ''}
                                    </span>
                                    </li>
                                ))}
                                {rentalFlowCamera.inclusions.length > 4 && (
                                    <li className="text-blue-600">+{rentalFlowCamera.inclusions.length - 4} more</li>
                                )}
                                </ul>
                            </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Select Rental Dates</h3>
                    <DateFilterInput
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateChange={handleStartDateChange}
                        onEndDateChange={handleEndDateChange}
                        minStartDate={new Date().toISOString().split('T')[0]}
                        disabled={isCheckingAvailability || isSubmitting || isGeneratingContract}
                        label="Rental Period"
                        idPrefix="rental-flow"
                    />
                </div>
                <div className="mb-6">
                    <button
                    onClick={handleCheckAvailability}
                    disabled={isCheckingAvailability || !startDate || !endDate || isSubmitting || isGeneratingContract}
                    className={`flex items-center px-4 py-2 rounded-lg ${
                        isCheckingAvailability || !startDate || !endDate || isSubmitting || isGeneratingContract
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                    >
                    {isCheckingAvailability ? (
                        <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking...
                        </>
                    ) : (
                        <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Check Availability
                        </>
                    )}
                    </button>
                    <div className="mt-4">
                    {availabilityError && (
                        <div className="text-red-600 bg-red-50 p-3 rounded-lg flex items-start">
                        <AlertCircle className="flex-shrink-0 mr-2 mt-0.5 h-5 w-5" />
                        <span>{availabilityError}</span>
                        </div>
                    )}
                    {isAvailabilityChecked && isAvailable && calculatedPrice && (
                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                        <div className="flex items-center text-green-800 mb-2">
                            <CheckCircle className="flex-shrink-0 mr-2 h-5 w-5" />
                            <span className="font-semibold">Camera model is available!</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="font-medium">Rental Duration:</span>
                            <span>{calculatedPrice.days} days</span>
                            <span className="font-medium">Price per Day:</span>
                            <span>{calculatedPrice.pricePerDay !== undefined ? `₱${calculatedPrice.pricePerDay.toFixed(2)}` : 'N/A'}</span>
                            <span className="font-bold text-base">Total Price:</span>
                            <span className="font-bold text-base text-green-700">{calculatedPrice.total !== undefined ? `₱${calculatedPrice.total.toFixed(2)}` : 'Calculating...'}</span>
                        </div>
                        </div>
                    )}
                    </div>
                </div>
                {!requestSuccess && (
                    <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-3 space-y-3 sm:space-y-0">
                        <button
                            onClick={onBackToBrowse}
                            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            disabled={isSubmitting || isGeneratingContract}
                        >
                            Cancel
                        </button>
                        {(isSubmitting || isGeneratingContract) ? (
                            <div className="px-5 py-2.5 flex items-center justify-center">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                <span>Processing Request...</span>
                            </div>
                        ) : (
                            <button
                                onClick={handleSignContract}
                                disabled={!isAvailable || !isAvailabilityChecked || isCheckingAvailability || isSubmitting || isGeneratingContract}
                                className={`px-5 py-2.5 rounded-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                    !isAvailable || !isAvailabilityChecked || isCheckingAvailability || isSubmitting || isGeneratingContract
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                                }`}
                            >
                                <FileText className="mr-2 h-4 w-4" />
                                Sign Rental Agreement
                            </button>
                        )}
                    </div>
                )}
                {requestError && !requestSuccess && (
                    <div className="mt-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                        {requestError}
                    </div>
                )}
                {requestSuccess && submittedRentalData && (
                    <div className="mt-6 p-6 text-center border rounded bg-green-50">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                            <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                        <h3 className="mt-4 text-2xl font-bold text-gray-900">Request Submitted!</h3>
                        <p className="mt-2 text-gray-600">
                            Your rental request for <span className="font-semibold">{displayCameraName}</span> is pending admin approval.
                        </p>
                        <div className="mt-4 p-3 bg-blue-50 rounded text-left text-sm inline-block">
                            <p className="font-medium">Details:</p>
                            <p>Period: {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}</p>
                            <p>Total: <span className="font-semibold">{calculatedPrice?.total !== undefined ? `₱${calculatedPrice.total.toFixed(2)}` : 'N/A'}</span></p>
                            <p>Reference ID: <span className="font-mono">{submittedRentalData.id}</span></p>
                        </div>
                        <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg">
                            <h4 className="font-medium text-gray-800 mb-3 flex items-center justify-center">
                                <FileText className="mr-2 h-5 w-5 text-blue-500" />
                                Your Rental Agreement
                            </h4>
                            {pdfViewError && (
                                <div className="mb-3 p-2 bg-red-50 text-red-700 text-sm rounded">
                                    {pdfViewError}
                                </div>
                            )}
                            {pdfSignedUrl ? (
                                <div className="flex flex-col items-center">
                                    <div className="mb-4 w-full h-64 border border-gray-300 rounded overflow-hidden">
                                        <iframe
                                            src={pdfSignedUrl}
                                            title="Signed Rental Agreement"
                                            className="w-full h-full"
                                            onError={(e) => {
                                                setPdfViewError("Failed to load PDF preview.");
                                            }}
                                        ></iframe>
                                    </div>
                                    <button
                                        onClick={handleOpenPdfInNewTab}
                                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                        disabled={isGeneratingPdfUrl}
                                    >
                                        <Eye className="mr-1 h-4 w-4" />
                                        Open in New Tab
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <button
                                        onClick={() => handleViewPdf(submittedRentalData.contract_pdf_url)}
                                        disabled={isGeneratingPdfUrl}
                                        className={`flex items-center px-4 py-2 rounded ${
                                            isGeneratingPdfUrl
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                    >
                                        {isGeneratingPdfUrl ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Preparing Document...
                                            </>
                                        ) : (
                                            <>
                                                <Eye className="mr-2 h-4 w-4" />
                                                View Contract
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                        <p className="mt-6 text-gray-600">
                            You will be notified once the admin confirms your booking.
                        </p>
                        <div className="mt-6">
                            <button
                                onClick={onBackToBrowse}
                                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Browse More Cameras
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
        <ContractSigningModal
            isOpen={showContractModal}
            onClose={() => setShowContractModal(false)}
            camera={rentalFlowCamera}
            startDate={startDate}
            endDate={endDate}
            calculatedPrice={calculatedPrice}
            onSubmitRequest={handleSubmitRentalRequestWithContract}
            isSubmitting={isSubmitting}
            isGeneratingContract={isGeneratingContract}
            sigCanvasRef={sigCanvasRef}
        />
    </div>
  );
};

export default RentalFlowSection;