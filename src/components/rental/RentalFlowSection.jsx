// src/components/RentalFlowSection.jsx
import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useCameraStore from '../../stores/cameraStore';
import DateFilterInput from '../forms/DateFilterInput';
import ContractSigningModal from '../modals/ContractSigningModal';
import useAuthStore from '../../stores/useAuthStore';
import { Camera, FileText, CheckCircle, AlertCircle, Loader2, ArrowLeft, Eye, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { checkCameraAvailability, createUserRentalRequest, calculateTotalPrice } from '../../services/rentalService';
import { findAvailableUnitOfModel } from '../../services/cameraService';
import { generateSignedContractPdf, uploadContractPdf, getSignedContractUrl } from '../../services/pdfService';
import { getUserById } from '../../services/userService';
import { isUserVerified } from '../../services/verificationService';
import { getInclusionsForCamera } from '../../services/inclusionService';

const RentalFlowSection = ({ onBackToBrowse, sourcePageType = "home", preSelectedDates = null }) => {
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
  const [inclusions, setInclusions] = useState([]);
  const [loadingInclusions, setLoadingInclusions] = useState(false);

  const sigCanvasRef = useRef();
  const navigate = useNavigate();

  // Load inclusions on component mount
  useEffect(() => {
    const loadInclusions = async () => {
      if (rentalFlowCamera?.id) {
        setLoadingInclusions(true);
        try {
          const { data: cameraInclusions, error } = await getInclusionsForCamera(rentalFlowCamera.id);
          
          if (error) {
            console.error('Error loading inclusions:', error);
            setInclusions([]);
          } else {
            setInclusions(cameraInclusions || []);
          }
        } catch (error) {
          console.error('Error loading inclusions:', error);
          setInclusions([]);
        } finally {
          setLoadingInclusions(false);
        }
      }
    };

    loadInclusions();
  }, [rentalFlowCamera?.id]);

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
    // Use preSelectedDates if available (from search page), otherwise use store dates
    const effectiveStartDate = preSelectedDates?.startDate || startDate;
    const effectiveEndDate = preSelectedDates?.endDate || endDate;
    
    if ((!rentalFlowCamera && !rentalFlowCameraModelName) || !effectiveStartDate || !effectiveEndDate) {
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
    
    const start = new Date(new Date(effectiveStartDate).setHours(0, 0, 0, 0));
    const end = new Date(new Date(effectiveEndDate).setHours(0, 0, 0, 0));
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
      
      const { data: availableUnit, error } = await findAvailableUnitOfModel(modelName, effectiveStartDate, effectiveEndDate);
      
      if (error) {
        setAvailabilityError(error);
        setIsAvailable(false);
      } else if (availableUnit) {
        setSelectedCameraUnitId(availableUnit.id);
        setIsAvailable(true);
        await calculateAndSetPrice(availableUnit.id, effectiveStartDate, effectiveEndDate);
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

  const handleRentNow = async () => {
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

  const handleSubmitRentalRequestWithContract = async (signatureDataUrlFromModal) => {
    // Use preSelectedDates if available (from search page), otherwise use store dates
    const effectiveStartDate = preSelectedDates?.startDate || startDate;
    const effectiveEndDate = preSelectedDates?.endDate || endDate;
    
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
      
      const { isAvailable: finalCheck } = await checkCameraAvailability(selectedCameraUnitId, effectiveStartDate, effectiveEndDate);
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
        startDate: new Date(effectiveStartDate).toLocaleDateString(),
        endDate: new Date(effectiveEndDate).toLocaleDateString(),
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
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
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
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header - Mobile and Desktop */}
      <div className="sticky top-0 z-20 bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between p-3 max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={onBackToBrowse}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          {/* Empty space for alignment */}
          <div className="flex-1"></div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {!requestSuccess ? (
          <>
            {/* Camera Photo */}
            <div className="mb-6">
              {rentalFlowCamera?.image_url ? (
                <img
                  src={rentalFlowCamera.image_url}
                  alt={rentalFlowCamera.name}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                  className="w-full h-64 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Camera className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </div>

            {/* Camera Name */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{displayCameraName}</h1>
            </div>

            {/* About Section */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
              <p className="text-gray-600 leading-relaxed">
                {rentalFlowCamera?.description || "Professional camera equipment for all your photography needs. Capture stunning images with this high-quality camera rental."}
              </p>
            </div>

            {/* Inclusions Section */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Inclusions</h2>
              {loadingInclusions ? (
                <div className="flex items-center text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading inclusions...
                </div>
              ) : inclusions.length > 0 ? (
                <div className="space-y-2">
                  {inclusions.map((inclusion, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                      <span className="text-gray-700">
                        {inclusion.inclusion_items?.name}
                        {inclusion.quantity > 1 ? ` (x${inclusion.quantity})` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No specific inclusions listed</p>
              )}
            </div>

            {/* Pricing Section */}
            {rentalFlowCamera?.camera_pricing_tiers && rentalFlowCamera.camera_pricing_tiers.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Pricing Tiers</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {rentalFlowCamera.camera_pricing_tiers.map((tier, index) => (
                    <div key={index} className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-sm text-gray-600 mb-1">
                        {tier.min_days === tier.max_days ? 
                          `${tier.min_days} ${tier.min_days === 1 ? 'Day' : 'Days'}` :
                          `${tier.min_days}-${tier.max_days} Days`
                        }
                      </div>
                      <div className="text-lg font-bold text-blue-600">
                        ₱{tier.price_per_day.toFixed(2)}/day
                      </div>
                      {tier.description && (
                        <div className="text-xs text-gray-500 mt-1">
                          {tier.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Date Selection Section */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Rental Period</h2>
              {sourcePageType === "home" && (
                <DateFilterInput
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={handleStartDateChange}
                  onEndDateChange={handleEndDateChange}
                  minStartDate={new Date().toISOString().split('T')[0]}
                  disabled={isCheckingAvailability || isSubmitting || isGeneratingContract}
                  label=""
                  idPrefix="rental-flow"
                  compact={true}
                />
              )}
              
              {sourcePageType === "search" && preSelectedDates && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center text-blue-800">
                    <Calendar className="mr-2 h-5 w-5" />
                    <span className="font-medium">
                      {new Date(preSelectedDates.startDate).toLocaleDateString()} - {new Date(preSelectedDates.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Availability Indicator */}
              {isAvailabilityChecked && isAvailable && (
                <div className="mt-3 flex items-center text-green-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Available for selected dates
                </div>
              )}
            </div>

            {/* Error Messages */}
            {availabilityError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start text-red-600">
                  <AlertCircle className="flex-shrink-0 mr-2 mt-0.5 h-5 w-5" />
                  <div>
                    <h4 className="font-medium mb-1">Availability Check Failed</h4>
                    <span className="text-sm">{availabilityError}</span>
                  </div>
                </div>
              </div>
            )}

            {requestError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start text-red-600">
                  <AlertCircle className="flex-shrink-0 mr-2 mt-0.5 h-5 w-5" />
                  <div>
                    <h4 className="font-medium mb-1">Request Failed</h4>
                    <span className="text-sm">{requestError}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Success Message */
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Request Submitted!</h3>
            <p className="text-lg text-gray-600 mb-6">
              Your rental request for <span className="font-semibold">{displayCameraName}</span> is pending admin approval.
            </p>
            
            {/* Rental Details */}
            <div className="bg-blue-50 rounded-lg p-6 mb-6 text-left max-w-md mx-auto">
              <h4 className="font-semibold text-gray-900 mb-4">Rental Details:</h4>
              <div className="space-y-3">
                <p><span className="font-medium">Period:</span> {new Date(preSelectedDates?.startDate || startDate).toLocaleDateString()} to {new Date(preSelectedDates?.endDate || endDate).toLocaleDateString()}</p>
                <p><span className="font-medium">Total:</span> <span className="text-xl font-bold text-green-600">{calculatedPrice?.total !== undefined ? `₱${calculatedPrice.total.toFixed(2)}` : 'N/A'}</span></p>
                <p><span className="font-medium">Reference ID:</span> <span className="font-mono text-sm bg-white px-2 py-1 rounded">{submittedRentalData.id}</span></p>
              </div>
            </div>

            {/* Contract PDF Section */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center justify-center text-lg">
                <FileText className="mr-2 h-6 w-6 text-blue-500" />
                Your Rental Agreement
              </h4>
              {pdfViewError && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                  {pdfViewError}
                </div>
              )}
              {pdfSignedUrl ? (
                <div className="space-y-4">
                  <div className="w-full h-64 border border-gray-300 rounded-lg overflow-hidden">
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
                    className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                    disabled={isGeneratingPdfUrl}
                  >
                    <Eye className="mr-2 h-5 w-5" />
                    Open in New Tab
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleViewPdf(submittedRentalData.contract_pdf_url)}
                  disabled={isGeneratingPdfUrl}
                  className={`flex items-center justify-center px-6 py-3 rounded-lg transition-colors mx-auto ${
                    isGeneratingPdfUrl
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isGeneratingPdfUrl ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Preparing Document...
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-5 w-5" />
                      View Contract
                    </>
                  )}
                </button>
              )}
            </div>
            
            <p className="text-gray-600 mb-6">
              You will be notified once the admin confirms your booking.
            </p>
            <button
              onClick={onBackToBrowse}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Browse More Cameras
            </button>
          </div>
        )}
      </div>

      {/* Fixed Bottom Action Bar - Mobile Only */}
      {!requestSuccess && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-10">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {/* Price Display */}
            <div className="flex-1">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Price</div>
              <div className="text-xl font-bold text-gray-900">
                {calculatedPrice?.total !== undefined ? `₱${calculatedPrice.total.toFixed(2)}` : 'Check availability'}
              </div>
            </div>
            
            {/* Action Button */}
            <div className="flex-1 flex justify-end">
              {(isSubmitting || isGeneratingContract) ? (
                <div className="px-6 py-3 flex items-center justify-center bg-gray-200 rounded-lg">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : !isAvailabilityChecked || !isAvailable ? (
                <button
                  onClick={handleCheckAvailability}
                  disabled={isCheckingAvailability || (sourcePageType === "home" && (!startDate || !endDate))}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    isCheckingAvailability || (sourcePageType === "home" && (!startDate || !endDate))
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                  }`}
                >
                  {isCheckingAvailability ? 'Checking...' : 'Check Availability'}
                </button>
              ) : (
                <button
                  onClick={handleRentNow}
                  disabled={!isAvailable || !isAvailabilityChecked || isCheckingAvailability}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    !isAvailable || !isAvailabilityChecked || isCheckingAvailability
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-md'
                  }`}
                >
                  Rent Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Action Buttons */}
      {!requestSuccess && (
        <div className="hidden lg:block max-w-4xl mx-auto px-4 pb-8">
          <div className="flex justify-end space-x-4">
            {(isSubmitting || isGeneratingContract) ? (
              <div className="px-6 py-3 flex items-center justify-center">
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                <span className="text-lg">Processing Request...</span>
              </div>
            ) : !isAvailabilityChecked || !isAvailable ? (
              <button
                onClick={handleCheckAvailability}
                disabled={isCheckingAvailability || (sourcePageType === "home" && (!startDate || !endDate))}
                className={`flex items-center px-6 py-3 rounded-lg text-base font-medium transition-all ${
                  isCheckingAvailability || (sourcePageType === "home" && (!startDate || !endDate))
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                }`}
              >
                {isCheckingAvailability ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Checking Availability...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-3 h-5 w-5" />
                    Check Availability & Calculate Price
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleRentNow}
                disabled={!isAvailable || !isAvailabilityChecked || isCheckingAvailability}
                className={`px-6 py-3 rounded-lg flex items-center justify-center text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${
                  !isAvailable || !isAvailabilityChecked || isCheckingAvailability
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                }`}
              >
                <FileText className="mr-3 h-5 w-5" />
                Rent Now
              </button>
            )}
          </div>
        </div>
      )}
        
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