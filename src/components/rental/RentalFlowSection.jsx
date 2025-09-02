// src/components/RentalFlowSection.jsx
import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useCameraStore from '../../stores/cameraStore';
import DateFilterInput from '../forms/DateFilterInput';
import ContractSigningModal from '../modals/ContractSigningModal';
import useAuthStore from '../../stores/useAuthStore';
import { Camera, FileText, CheckCircle, AlertCircle, Loader2, ArrowLeft, Eye, Calendar } from 'lucide-react';
import { checkCameraAvailability, createUserRentalRequest, calculateTotalPrice } from '../../services/rentalService';
import { findAvailableUnitOfModel } from '../../services/cameraService';
import { generateSignedContractPdf, uploadContractPdf, getSignedContractUrl } from '../../services/pdfService';
import { getUserById } from '../../services/userService';
import { isUserVerified } from '../../services/verificationService';
import { supabase } from '../../lib/supabaseClient';

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
  const [activeTab, setActiveTab] = useState("description");
  const [inclusions, setInclusions] = useState([]);
  const [loadingInclusions, setLoadingInclusions] = useState(false);
  const [isDateSelectorOpen, setIsDateSelectorOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);
  const [footerState, setFooterState] = useState('initial'); // 'initial', 'selectingDates', 'checking', 'available', 'unavailable'

  const sigCanvasRef = useRef();
  const navigate = useNavigate();

  // Fetch inclusions when camera changes
  useEffect(() => {
    if (!rentalFlowCamera?.id) return;

    const fetchInclusions = async () => {
      setLoadingInclusions(true);
      const { data, error } = await supabase
        .from("camera_inclusions")
        .select("quantity, inclusion_items:inclusion_items(name)")
        .eq("camera_id", rentalFlowCamera.id);

      if (error) {
        console.error("Error fetching inclusions:", error);
        setInclusions([]);
      } else {
        setInclusions(data || []);
      }

      setLoadingInclusions(false);
    };

    fetchInclusions();
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
      setFooterState('unavailable');
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

  const handleStartDateChange = (e) => {
    if (isDateSelectorOpen) {
      setTempStartDate(e.target.value);
    } else {
      handleRentalFlowDateChange(e, 'start');
    }
  };
  
  const handleEndDateChange = (e) => {
    if (isDateSelectorOpen) {
      setTempEndDate(e.target.value);
    } else {
      handleRentalFlowDateChange(e, 'end');
    }
  };

  const handleFooterButtonClick = async () => {
    if (footerState === 'initial') {
      // If coming from search page with pre-selected dates, skip date selection and go directly to checking
      if (sourcePageType === "search" && preSelectedDates?.startDate && preSelectedDates?.endDate) {
        // Set checking state and proceed with availability check
        setFooterState('checking');
        setAvailabilityError('');
        setIsAvailabilityChecked(false);
        setIsAvailable(false);
        
        // Use pre-selected dates directly for availability check
        setTimeout(async () => {
          try {
            const effectiveStartDate = preSelectedDates.startDate;
            const effectiveEndDate = preSelectedDates.endDate;

            if (!rentalFlowCamera && !rentalFlowCameraModelName) {
              setAvailabilityError("Camera information is missing.");
              setFooterState('unavailable');
              return;
            }

            // Enforce verification before proceeding
            const canRent = await isUserVerified(user.id);
            if (!canRent) {
              setAvailabilityError("Please complete your profile verification first.");
              setFooterState('unavailable');
              return;
            }

            const start = new Date(new Date(effectiveStartDate).setHours(0, 0, 0, 0));
            const end = new Date(new Date(effectiveEndDate).setHours(0, 0, 0, 0));
            if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
              setAvailabilityError("Please select valid dates. End date must be on or after start date.");
              setFooterState('unavailable');
              return;
            }

            setIsCheckingAvailability(true);

            // Use the model name to find an available unit
            const modelName = rentalFlowCameraModelName || rentalFlowCamera?.name;
            if (!modelName) {
              setAvailabilityError("Camera model information is missing.");
              setFooterState('unavailable');
              return;
            }

            const { data: availableUnit, error } = await findAvailableUnitOfModel(modelName, effectiveStartDate, effectiveEndDate);

            if (error) {
              setAvailabilityError(error);
              setFooterState('unavailable');
            } else {
              setSelectedCameraUnitId(availableUnit.id);
              setIsAvailable(true);
              setIsAvailabilityChecked(true);
              await calculateAndSetPrice(availableUnit.id, effectiveStartDate, effectiveEndDate);
              setFooterState('available');
            }
          } catch (err) {
            console.error('Search page availability check error:', err);
            setAvailabilityError(err.message || "An error occurred while checking availability.");
            setFooterState('unavailable');
          } finally {
            setIsCheckingAvailability(false);
          }
        }, 100);
      } else {
        // For home page or when no pre-selected dates, show date selector
        setTempStartDate(startDate);
        setTempEndDate(endDate);
        setIsDateSelectorOpen(true);
        setFooterState('selectingDates');
      }
    } else if (footerState === 'selectingDates') {
      // Check dates and validate
      if (!tempStartDate || !tempEndDate) {
        return;
      }
      
      // Update store with selected dates
      handleRentalFlowDateChange({ target: { value: tempStartDate } }, 'start');
      handleRentalFlowDateChange({ target: { value: tempEndDate } }, 'end');
      
      // Close date selector and set checking state
      setIsDateSelectorOpen(false);
      setFooterState('checking');
      setAvailabilityError('');
      setIsAvailabilityChecked(false);
      setIsAvailable(false);
      
      // Check availability with the new dates
      setTimeout(async () => {
        try {
          // Use the temporary dates for availability check
          const effectiveStartDate = tempStartDate;
          const effectiveEndDate = tempEndDate;

          if (!rentalFlowCamera && !rentalFlowCameraModelName) {
            setAvailabilityError("Camera information is missing.");
            setFooterState('unavailable');
            return;
          }

          // Enforce verification before proceeding
          const canRent = await isUserVerified(user.id);
          if (!canRent) {
            setAvailabilityError("Please complete your profile verification first.");
            setFooterState('unavailable');
            return;
          }

          const start = new Date(new Date(effectiveStartDate).setHours(0, 0, 0, 0));
          const end = new Date(new Date(effectiveEndDate).setHours(0, 0, 0, 0));
          if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
            setAvailabilityError("Please select valid dates. End date must be on or after start date.");
            setFooterState('unavailable');
            return;
          }

          setIsCheckingAvailability(true);

          // Use the model name to find an available unit
          const modelName = rentalFlowCameraModelName || rentalFlowCamera?.name;
          if (!modelName) {
            setAvailabilityError("Camera model information is missing.");
            setFooterState('unavailable');
            return;
          }

          const { data: availableUnit, error } = await findAvailableUnitOfModel(modelName, effectiveStartDate, effectiveEndDate);

          if (error) {
            setAvailabilityError(error);
            setFooterState('unavailable');
          } else {
            setSelectedCameraUnitId(availableUnit.id);
            setIsAvailable(true);
            setIsAvailabilityChecked(true);
            await calculateAndSetPrice(availableUnit.id, effectiveStartDate, effectiveEndDate);
            setFooterState('available');
          }
        } catch (err) {
          console.error('Mobile availability check error:', err);
          setAvailabilityError(err.message || "An error occurred while checking availability.");
          setFooterState('unavailable');
        } finally {
          setIsCheckingAvailability(false);
        }
      }, 100);
    } else if (footerState === 'available') {
      // Proceed to rent
      handleRentNow();
    }
    // If unavailable, button should be disabled
  };

  // Update footer state based on availability results
  React.useEffect(() => {
    if (footerState === 'checking' && !isCheckingAvailability) {
      if (isAvailabilityChecked && isAvailable) {
        setFooterState('available');
      } else if (isAvailabilityChecked && !isAvailable) {
        setFooterState('unavailable');
      }
    }
  }, [isCheckingAvailability, isAvailabilityChecked, isAvailable, footerState]);

  // Initialize footer state for search page
  React.useEffect(() => {
    if (sourcePageType === 'search' && preSelectedDates) {
      // For search page, start with initial state since dates are already set
      setFooterState('initial');
    } else if (sourcePageType === 'home') {
      if (startDate && endDate && isAvailabilityChecked && isAvailable) {
        setFooterState('available');
      } else {
        setFooterState('initial');
      }
    }
  }, [sourcePageType, preSelectedDates]);

  const getButtonText = () => {
    switch (footerState) {
      case 'initial':
        return 'Check';
      case 'selectingDates':
        return 'Check Dates';
      case 'checking':
        return 'Checking...';
      case 'available':
        // Show processing state when generating contract or submitting
        if (isGeneratingContract || isSubmitting) {
          return 'Processing...';
        }
        return 'Rent Now';
      case 'unavailable':
        return 'Date Not Available';
      default:
        return 'Check';
    }
  };

  const getButtonStyle = () => {
    switch (footerState) {
      case 'unavailable':
        return 'bg-red-100/80 text-red-500 cursor-not-allowed';
      case 'checking':
        return 'bg-gray-100/80 text-gray-500 cursor-not-allowed';
      case 'available':
        // Show disabled state when processing
        if (isGeneratingContract || isSubmitting) {
          return 'bg-gray-100/80 text-gray-500 cursor-not-allowed';
        }
        return 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg';
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg';
    }
  };

  const isButtonDisabled = () => {
    return footerState === 'checking' || 
           footerState === 'unavailable' || 
           (footerState === 'selectingDates' && (!tempStartDate || !tempEndDate)) ||
           isSubmitting || 
           isGeneratingContract;
  };

  if (!rentalFlowCamera && !rentalFlowCameraModelName) {
      return null;
  }

  // Get display name - prefer model name, fallback to camera name
  const displayCameraName = rentalFlowCameraModelName || rentalFlowCamera?.name || "Unknown Camera";

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Section */}
      <div className="bg-gray-100 flex flex-col items-center pt-4">
        {/* Back Button (separate above image) */}
        <div className="w-full px-4 mb-4">
          <button
            onClick={onBackToBrowse}
            className="bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition"
            aria-label="Go back to browse"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Camera Image - Made Responsive */}
        {rentalFlowCamera?.image_url ? (
          <img
            src={rentalFlowCamera.image_url}
            alt={rentalFlowCamera.name}
            onError={(e) => {
              e.target.style.display = "none";
            }}
            className="max-h-48 h-auto object-cover"
          />
        ) : (
          <div className="w-full max-h-48 h-48 bg-gray-200 flex items-center justify-center rounded-lg shadow-sm">
            <Camera className="h-12 w-12 text-gray-400" />
          </div>
        )}
      </div>

      {/* Bottom Section: White Background */}
      <div className="bg-white rounded-t-2xl mt-4 p-4 sm:p-6 shadow-md flex-grow lg:pb-6"> {/* Added pb-24 for mobile to avoid footer overlap */}
        {!requestSuccess ? (
          <>
            {/* Camera Name - Slightly smaller heading */}
            <h1 className="text-xl font-bold text-gray-900 mb-3"> {/* text-2xl -> text-xl, mb-2 -> mb-3 */}
              {displayCameraName}
            </h1>

           {/* Pricing Section */}
            {rentalFlowCamera?.camera_pricing_tiers?.length > 0 && (
              <div className="mb-5"> {/* Reduced margin */}
                <div className="grid grid-cols-2 gap-3 text-center"> {/* Reduced gap */}
                  {/* 1–3 Days */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">1–3 Days</div>
                    <div className="text-sm font-semibold"> {/* font-bold -> font-semibold for slightly less weight */}
                      ₱{rentalFlowCamera.camera_pricing_tiers[0]?.price_per_day.toFixed(2)}/day
                    </div>
                  </div>

                  {/* 4+ Days */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">4+ Days</div>
                    <div className="text-sm font-semibold">
                      ₱{rentalFlowCamera.camera_pricing_tiers[1]?.price_per_day.toFixed(2)}/day
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* Tabs (Description & Inclusions) */}
            <div className="mb-5"> {/* Reduced margin */}
              <div className="flex border-b border-gray-200 mb-3"> {/* Reduced margin */}
                <button
                  onClick={() => setActiveTab("description")}
                  className={`flex-1 py-2 text-center text-sm font-medium ${ // Smaller text
                    activeTab === "description"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  aria-selected={activeTab === "description"}
                >
                  Description
                </button>
                <button
                  onClick={() => setActiveTab("inclusions")}
                  className={`flex-1 py-2 text-center text-sm font-medium ${ // Smaller text
                    activeTab === "inclusions"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  aria-selected={activeTab === "inclusions"}
                >
                  Inclusions
                </button>
              </div>

              {/* Description Tab */}
              {activeTab === "description" && (
                <div>
                  <p className="text-gray-600 text-sm leading-relaxed"> {/* Explicit text-sm for body text */}
                    {rentalFlowCamera?.description || (
                      <span className="text-gray-400">No description available</span>
                    )}
                  </p>
                </div>
              )}

              {/* Inclusions Tab */}
              {activeTab === "inclusions" && (
                <div>
                  {loadingInclusions ? (
                    <div className="flex items-center text-gray-500 text-sm"> {/* Smaller text */}
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading inclusions...
                    </div>
                  ) : inclusions.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                      {inclusions.map((inclusion, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                          <span className="text-gray-700 text-sm"> {/* Smaller text */}
                            {inclusion.inclusion_items?.name}
                            {inclusion.quantity > 1 ? ` (x${inclusion.quantity})` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No specific inclusions listed</p> 
                  )}
                </div>
              )}
            </div>

            {/* Date Selection Section - Desktop only or when dates are selected */}
            {(sourcePageType === "search" && preSelectedDates) ? (
              <div className="mb-5">
                <h2 className="text-base font-semibold text-center text-gray-900 mb-3">Rental Period</h2> 
                <div className="bg-blue-50 rounded-lg p-3"> 
                  <div className="flex items-center text-blue-800 text-sm"> 
                    <Calendar className="mr-2 h-4 w-4 flex-shrink-0" /> 
                    <span className="font-medium truncate">
                      {new Date(preSelectedDates.startDate).toLocaleDateString()} - {new Date(preSelectedDates.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {/* Availability Indicator */}
                {isAvailabilityChecked && isAvailable && (
                  <div className="mt-2 flex items-center text-green-600 text-sm"> 
                    <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" /> 
                    Available for selected dates
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Date Selection */}
                <div className="mb-5 hidden lg:block">
                  <h2 className="text-base font-semibold text-center text-gray-900 mb-3">Rental Period</h2> 
                  <DateFilterInput
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={(e) => handleRentalFlowDateChange(e, 'start')}
                    onEndDateChange={(e) => handleRentalFlowDateChange(e, 'end')}
                    minStartDate={new Date().toISOString().split('T')[0]}
                    disabled={isCheckingAvailability || isSubmitting || isGeneratingContract}
                    label=""
                    idPrefix="rental-flow-desktop"
                  />
                  {/* Availability Indicator */}
                  {isAvailabilityChecked && isAvailable && (
                    <div className="mt-2 flex items-center text-green-600 text-sm"> 
                      <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" /> 
                      Available for selected dates
                    </div>
                  )}
                </div>

                {/* Desktop Price Breakdown Invoice - Show when available and price is calculated */}
                {isAvailabilityChecked && isAvailable && calculatedPrice && (
                  <div className="mb-5 hidden lg:block">
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden max-w-md mx-auto">
                      {/* Header */}
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          Rental Summary
                        </h3>
                      </div>
                      
                      {/* Breakdown Details */}
                      <div className="px-4 py-3 space-y-3">
                        {/* Rental Period */}
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Rental Period</span>
                          <span className="font-medium text-gray-900">
                            {calculatedPrice.days} {calculatedPrice.days === 1 ? 'day' : 'days'}
                          </span>
                        </div>

                        {/* Rate Type and Per Day Price */}
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">
                            Rate ({calculatedPrice.days >= 4 ? 'Discounted' : 'Standard'})
                          </span>
                          <span className="font-medium text-gray-900">
                            ₱{calculatedPrice.pricePerDay.toFixed(2)}/day
                          </span>
                        </div>

                        {/* Discount Indicator */}
                        {calculatedPrice.days >= 4 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-green-600 flex items-center">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                              Long-term Discount
                            </span>
                            <span className="text-green-600 font-medium">Applied</span>
                          </div>
                        )}

                        {/* Divider */}
                        <div className="border-t border-gray-100"></div>

                        {/* Subtotal Calculation */}
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">
                            {calculatedPrice.days} × ₱{calculatedPrice.pricePerDay.toFixed(2)}
                          </span>
                          <span className="font-medium text-gray-900">
                            ₱{calculatedPrice.total.toFixed(2)}
                          </span>
                        </div>

                        {/* Total */}
                        <div className="border-t border-gray-200 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-base font-semibold text-gray-900">Total Amount</span>
                            <span className="text-lg font-bold text-blue-600">
                              ₱{calculatedPrice.total.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile Date Display - Only show after dates are confirmed */}
                <div className="mb-5 lg:hidden">
                  {startDate && endDate && footerState !== 'initial' && footerState !== 'selectingDates' && (
                    <>
                      <h2 className="text-base font-semibold text-center text-gray-900 mb-3">Rental Period</h2> 
                      <div className="bg-blue-50 rounded-lg p-3"> 
                        <div className="flex items-center text-blue-800 text-sm"> 
                          <Calendar className="mr-2 h-4 w-4 flex-shrink-0" /> 
                          <span className="font-medium truncate">
                            {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {/* Availability Indicator */}
                      {isAvailabilityChecked && isAvailable && (
                        <div className="mt-2 flex items-center text-green-600 text-sm"> 
                          <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" /> 
                          Available for selected dates
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Price Breakdown Invoice - Show when available and price is calculated */}
                {isAvailabilityChecked && isAvailable && calculatedPrice && (
                  <div className="mb-5 lg:hidden">
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                      {/* Header */}
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          Rental Summary
                        </h3>
                      </div>
                      
                      {/* Breakdown Details */}
                      <div className="px-4 py-3 space-y-3">
                        {/* Rental Period */}
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Rental Period</span>
                          <span className="font-medium text-gray-900">
                            {calculatedPrice.days} {calculatedPrice.days === 1 ? 'day' : 'days'}
                          </span>
                        </div>

                        {/* Rate Type and Per Day Price */}
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">
                            Rate ({calculatedPrice.days >= 4 ? 'Discounted' : 'Standard'})
                          </span>
                          <span className="font-medium text-gray-900">
                            ₱{calculatedPrice.pricePerDay.toFixed(2)}/day
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Error Messages */}
            {availabilityError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5"> 
                <div className="flex items-start text-red-600 text-sm"> 
                  <AlertCircle className="flex-shrink-0 mr-2 mt-0.5 h-4 w-4" /> 
                  <div>
                    <h4 className="font-medium mb-1">Availability Check Failed</h4>
                    <span>{availabilityError}</span>
                  </div>
                </div>
              </div>
            )}

            {requestError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5"> 
                <div className="flex items-start text-red-600 text-sm"> 
                  <AlertCircle className="flex-shrink-0 mr-2 mt-0.5 h-4 w-4" /> 
                  <div>
                    <h4 className="font-medium mb-1">Request Failed</h4>
                    <span>{requestError}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Success Message */
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-3"> {/* Smaller icon container */}
              <CheckCircle className="h-6 w-6 text-green-600" /> {/* Smaller icon */}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h3> {/* text-2xl -> text-xl, mb-3 -> mb-2 */}
            <p className="text-gray-600 mb-5 text-sm"> {/* Smaller text, reduced margin */}
              Your rental request for <span className="font-semibold">{displayCameraName}</span> is pending admin approval.
            </p>

            {/* Rental Details */}
            <div className="bg-blue-50 rounded-lg p-4 mb-5 text-left max-w-md mx-auto"> {/* Reduced padding/margin */}
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Rental Details:</h4> {/* Smaller text, reduced margin */}
              <div className="space-y-2"> {/* Reduced spacing */}
                <p className="text-sm"><span className="font-medium">Period:</span> {new Date(preSelectedDates?.startDate || startDate).toLocaleDateString()} to {new Date(preSelectedDates?.endDate || endDate).toLocaleDateString()}</p>
                <p className="text-sm"><span className="font-medium">Total:</span> <span className="text-lg font-bold text-green-600">{calculatedPrice?.total !== undefined ? `₱${calculatedPrice.total.toFixed(2)}` : 'N/A'}</span></p>
                <p className="text-sm"><span className="font-medium">Reference ID:</span> <span className="font-mono text-xs bg-white px-1.5 py-0.5 rounded">{submittedRentalData.id}</span></p> {/* text-sm -> text-xs, adjusted padding */}
              </div>
            </div>

            {/* Contract PDF Section */}
            <div className="mb-5"> {/* Reduced margin */}
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center justify-center text-base"> {/* text-lg -> text-base, reduced margin */}
                <FileText className="mr-2 h-5 w-5 text-blue-500" /> {/* Slightly smaller icon */}
                Your Rental Agreement
              </h4>
              {pdfViewError && (
                <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm"> {/* Reduced margins/padding, smaller text */}
                  {pdfViewError}
                </div>
              )}
              {pdfSignedUrl ? (
                <div className="space-y-3"> {/* Reduced spacing */}
                  <div className="w-full h-48 border border-gray-300 rounded-lg overflow-hidden"> {/* Reduced height */}
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
                    className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors mx-auto" // Smaller padding/text
                    disabled={isGeneratingPdfUrl}
                  >
                    <Eye className="mr-1.5 h-4 w-4" /> {/* Smaller icon, reduced margin */}
                    Open in New Tab
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleViewPdf(submittedRentalData.contract_pdf_url)}
                  disabled={isGeneratingPdfUrl}
                  className={`flex items-center justify-center px-4 py-2 rounded-lg transition-colors mx-auto text-sm ${ // Smaller padding/text
                    isGeneratingPdfUrl
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isGeneratingPdfUrl ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {/* Smaller icon, reduced margin */}
                      Preparing Document...
                    </>
                  ) : (
                    <>
                      <Eye className="mr-1.5 h-4 w-4" /> {/* Smaller icon, reduced margin */}
                      View Contract
                    </>
                  )}
                </button>
              )}
            </div>

            <p className="text-gray-600 mb-5 text-sm"> {/* Smaller text, reduced margin */}
              You will be notified once the admin confirms your booking.
            </p>
            <button
              onClick={onBackToBrowse}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium transition-all shadow-sm hover:shadow"> {/* Smaller padding/text, reduced shadow */}
              Browse More Cameras
            </button>
          </div>
        )}
      </div>

      {/* Modern Floating Bottom Action Bar - Mobile Only */}
      {!requestSuccess && (
        <div className={`lg:hidden fixed inset-x-0 bottom-1 mx-2 bg-white/95 backdrop-blur-xl border border-gray-200/70 rounded-2xl shadow-lg shadow-gray-400/10 z-40 transition-all duration-300 ease-in-out`}>
          {/* Date Selector Section - Expandable */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isDateSelectorOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="p-4 border-b border-gray-100">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Rental Period</h3>
                <DateFilterInput
                  startDate={tempStartDate}
                  endDate={tempEndDate}
                  onStartDateChange={handleStartDateChange}
                  onEndDateChange={handleEndDateChange}
                  minStartDate={new Date().toISOString().split('T')[0]}
                  disabled={isCheckingAvailability || isSubmitting || isGeneratingContract}
                  label=""
                  idPrefix="rental-flow-mobile"
                />
              </div>
            </div>
          </div>

          {/* Main Action Section */}
          <div className="flex items-center justify-between p-4">
            {/* Price Display */}
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Total Price</div>
              <div className="text-base font-bold text-gray-900 truncate">
                {calculatedPrice?.total !== undefined ? `₱${calculatedPrice.total.toFixed(2)}` : 'Check availability'}
              </div>
            </div>

            {/* Single Action Button */}
            <div className="flex-1 flex justify-end ml-2">
              <button
                onClick={handleFooterButtonClick}
                disabled={isButtonDisabled()}
                className={`px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${getButtonStyle()}`}
              >
                {(footerState === 'checking' || (footerState === 'available' && (isGeneratingContract || isSubmitting))) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                )}
                {getButtonText()}
              </button>
            </div>
          </div>
        </div>
      )}      {/* Desktop Action Buttons */}
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