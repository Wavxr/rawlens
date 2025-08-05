// src/pages/user/Cameras.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { getAllCameras, getCamera } from '../../services/cameraService';
import { getCameraWithInclusions } from '../../services/inclusionService';
import { getAvailableCamerasForDates } from '../../services/calendarService';
import { checkCameraAvailability, createUserRentalRequest } from '../../services/rentalService';
import { generateSignedContractPdf, uploadContractPdf, getSignedContractUrl } from '../../services/pdfService';
import { fetchUserById } from '../../services/userService';
import ContractSigningModal from '../../components/ContractSigningModal';
import CameraBrowserSection from '../../components/CameraBrowserSection';
import { Camera, Calendar, Clock, Tag, Search, Filter, X, FileText, CheckCircle, AlertCircle, Loader2, ArrowLeft, Eye } from 'lucide-react';

export default function UserCameras() {
  const [cameras, setCameras] = useState([]);
  const [displayedCameras, setDisplayedCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterLoading, setFilterLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [rentalFlowCamera, setRentalFlowCamera] = useState(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isAvailabilityChecked, setIsAvailabilityChecked] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [calculatedPrice, setCalculatedPrice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [submittedRentalData, setSubmittedRentalData] = useState(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const sigCanvasRef = useRef();
  const [pdfSignedUrl, setPdfSignedUrl] = useState(null);
  const [isGeneratingPdfUrl, setIsGeneratingPdfUrl] = useState(false);
  const [pdfViewError, setPdfViewError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: camerasWithPricing, error: pricingError } = await getAllCameras();
        if (pricingError) {
          throw new Error(pricingError.message);
        }
        const camerasWithFullData = await Promise.all(
          (camerasWithPricing || []).map(async (camera) => {
            const trimmedCamera = {
              ...camera,
              image_url: camera.image_url ? camera.image_url.trim() : null
            };
            const { data: cameraWithInclusions, error: inclusionsError } = await getCameraWithInclusions(trimmedCamera.id);
            if (inclusionsError) {
              return { ...trimmedCamera, inclusions: [] };
            }
            return {
              ...trimmedCamera,
              inclusions: cameraWithInclusions?.camera_inclusions || []
            };
          })
        );
        setCameras(camerasWithFullData);
        setDisplayedCameras(camerasWithFullData);
      } catch (err) {
        setError('Failed to load cameras. Please try again later.');
        setDisplayedCameras([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCameras();
  }, []);

  const handleDateChange = (e, dateType) => {
    if (dateType === 'start') {
      setStartDate(e.target.value);
      if (endDate && e.target.value && new Date(e.target.value) >= new Date(endDate)) {
        setEndDate('');
      }
    } else if (dateType === 'end') {
      setEndDate(e.target.value);
    }
    if ((dateType === 'start' && !e.target.value) || (dateType === 'end' && !e.target.value)) {
        if (!startDate && !endDate) {
            setIsFilterActive(false);
            setDisplayedCameras(cameras);
        }
    }
  };

  const handleApplyFilter = async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates.");
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      setError("Please select valid dates. End date must be after start date.");
      return;
    }
    setError('');
    setFilterLoading(true);
    try {
      const { data: availableCamerasData, error: availabilityError } = await getAvailableCamerasForDates(startDate, endDate);
      if (availabilityError) {
        throw new Error(availabilityError.message || "Failed to fetch availability.");
      }
      const cleanedAvailableCamerasData = availableCamerasData.map(camera => ({
        ...camera,
        image_url: camera.image_url ? camera.image_url.trim() : null
      }));
      const availableCameraIds = new Set(
        cleanedAvailableCamerasData
          .filter(item => item.isAvailable)
          .map(item => item.id)
      );
      const filteredCameras = cameras.filter(camera => availableCameraIds.has(camera.id));
      setDisplayedCameras(filteredCameras);
      setIsFilterActive(true);
    } catch (err) {
      setError(err.message || "An error occurred while filtering cameras.");
      setDisplayedCameras([]);
    } finally {
      setFilterLoading(false);
    }
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setIsFilterActive(false);
    setDisplayedCameras(cameras);
    setError('');
  };

  const handleRentClick = (camera) => {
    resetRentalFlowState();
    setRentalFlowCamera(camera);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetRentalFlowState = () => {
    setRentalFlowCamera(null);
    setIsCheckingAvailability(false);
    setIsAvailabilityChecked(false);
    setIsAvailable(false);
    setAvailabilityError('');
    setCalculatedPrice(null);
    setRequestError('');
    setRequestSuccess(false);
    setShowContractModal(false);
    setSignatureDataUrl(null);
    setSubmittedRentalData(null);
    setPdfSignedUrl(null);
    setPdfViewError('');
    if (sigCanvasRef.current) {
        sigCanvasRef.current.clear();
    }
  };

  const handleRentalFlowDateChange = (e, dateType) => {
    if (dateType === 'start') {
      setStartDate(e.target.value);
    } else if (dateType === 'end') {
      setEndDate(e.target.value);
    }
    setIsAvailabilityChecked(false);
    setIsAvailable(false);
    setCalculatedPrice(null);
    setAvailabilityError('');
  };

  const handleCheckAvailability = async () => {
    if (!rentalFlowCamera || !startDate || !endDate) {
      setAvailabilityError("Please select a camera and both start and end dates.");
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      setAvailabilityError("Please select valid dates. End date must be after start date.");
      return;
    }
    setAvailabilityError('');
    setIsCheckingAvailability(true);
    setIsAvailabilityChecked(false);
    setIsAvailable(false);
    try {
      const { isAvailable: avail, error } = await checkCameraAvailability(rentalFlowCamera.id, startDate, endDate);
      if (error) throw new Error(error.message || "Failed to check availability.");
      setIsAvailable(avail);
      if (!avail) {
        setAvailabilityError("Sorry, this camera is no longer available for the selected dates.");
      } else {
        calculateAndSetPrice(rentalFlowCamera.id, startDate, endDate);
      }
      setIsAvailabilityChecked(true);
    } catch (err) {
      setAvailabilityError(err.message || "An error occurred while checking availability.");
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const calculateAndSetPrice = async (cameraId, start, end) => {
    const startD = new Date(start);
    const endD = new Date(end);
    const timeDiff = endD.getTime() - startD.getTime();
    const rentalDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    if (rentalDays <= 0) {
        setAvailabilityError("Invalid rental period.");
        return;
    }
    try {
        const { data: cameraData, error: tierError } = await getCamera(cameraId);
        if (tierError) throw new Error(tierError.message);
        const tiers = cameraData.camera_pricing_tiers;
        const applicableTier = tiers.find(tier =>
            rentalDays >= tier.min_days && (tier.max_days === null || rentalDays <= tier.max_days)
        );
        if (!applicableTier) {
            setAvailabilityError(`No pricing tier found for a rental of ${rentalDays} days.`);
            return;
        }
        const totalPrice = rentalDays * applicableTier.price_per_day;
        setCalculatedPrice({
            days: rentalDays,
            pricePerDay: applicableTier.price_per_day,
            total: totalPrice
        });
    } catch (err) {
        setAvailabilityError("Failed to calculate rental price.");
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
        // Do nothing, let the loading state handle user feedback
    } else {
        setRequestError("Please confirm availability and price before signing.");
    }
  };


  const handleSubmitRentalRequestWithContract = async (signatureDataUrl) => {
    if (!signatureDataUrl) {
        setRequestError("Signature data is missing.");
        setShowContractModal(true);
        return;
    }
    if (!rentalFlowCamera || !startDate || !endDate || !calculatedPrice) {
      setRequestError("Missing required information (camera, dates, price, or signature).");
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
      const { isAvailable: finalCheck } = await checkCameraAvailability(rentalFlowCamera.id, startDate, endDate);
      if (!finalCheck) {
        throw new Error("Camera is no longer available. Please select different dates.");
      }

      let customerName = "User";
      let customerEmail = "user_email_placeholder";
      let customerContact = "user_contact_placeholder";
      try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser?.id) {
              const userData = await fetchUserById(authUser.id);
              customerName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email || "User";
              customerEmail = userData.email || "user_email_placeholder";
              customerContact = userData.contact_number || "user_contact_placeholder";
          }
      } catch (userFetchError) {
          // Silent fail or log if needed
      }

      const rentalDetails = {
        cameraName: rentalFlowCamera.name,
        startDate: new Date(startDate).toLocaleDateString(),
        endDate: new Date(endDate).toLocaleDateString(),
        customerName: customerName,
      };
      const pdfBytes = await generateSignedContractPdf(signatureDataUrl, rentalDetails);
      const fileName = `contract_${rentalFlowCamera.id}_${Date.now()}.pdf`;
      const { success, filePath } = await uploadContractPdf(pdfBytes, fileName);
      if (!success || !filePath) {
         throw new Error("Contract upload did not return a valid file path.");
      }
      setIsSubmitting(true); // Set submitting state before DB call
      const { data: rentalData, error } = await createUserRentalRequest({
        cameraId: rentalFlowCamera.id,
        startDate,
        endDate,
        contractPdfUrl: filePath,
        customerInfo: {
            name: customerName,
            contact: customerContact,
            email: customerEmail,
        }
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
      setIsSubmitting(false); // Ensure submitting state is reset
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
        handleViewPdf(submittedRentalData.contract_pdf_url).then(() => {
            setTimeout(() => {
                if (pdfSignedUrl) window.open(pdfSignedUrl, '_blank', 'noopener,noreferrer');
            }, 100);
        });
    }
  };

  const handleBackToBrowse = () => {
    resetRentalFlowState();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  if (error && !filterLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* --- RENTAL CONFIRMATION SECTION --- */}
      {rentalFlowCamera && (
        <div className="max-w-4xl mx-auto mb-12">
            <button
                onClick={handleBackToBrowse}
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
                                <h3 className="text-xl font-semibold text-gray-900">{rentalFlowCamera.name}</h3>
                                <p className="mt-1 text-gray-600">{rentalFlowCamera.description}</p>
                                {rentalFlowCamera.inclusions && rentalFlowCamera.inclusions.length > 0 && (
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="rental-start-date" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                <Calendar className="mr-1.5 h-4 w-4" />
                                Start Date
                                </label>
                                <input
                                type="date"
                                id="rental-start-date"
                                value={startDate}
                                onChange={(e) => handleRentalFlowDateChange(e, 'start')}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div>
                                <label htmlFor="rental-end-date" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                <Clock className="mr-1.5 h-4 w-4" />
                                End Date
                                </label>
                                <input
                                type="date"
                                id="rental-end-date"
                                value={endDate}
                                onChange={(e) => handleRentalFlowDateChange(e, 'end')}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                min={startDate ? new Date(new Date(startDate).getTime() + 86400000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                                disabled={!startDate}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="mb-6">
                        <button
                        onClick={handleCheckAvailability}
                        disabled={isCheckingAvailability || !startDate || !endDate}
                        className={`flex items-center px-4 py-2 rounded-lg ${
                            isCheckingAvailability || !startDate || !endDate
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
                                <span className="font-semibold">Camera is available!</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span className="font-medium">Rental Duration:</span>
                                <span>{calculatedPrice.days} days</span>
                                <span className="font-medium">Price per Day:</span>
                                <span>₱{calculatedPrice.pricePerDay.toFixed(2)}</span>
                                <span className="font-bold text-base">Total Price:</span>
                                <span className="font-bold text-base text-green-700">₱{calculatedPrice.total.toFixed(2)}</span>
                            </div>
                            </div>
                        )}
                        </div>
                    </div>
                    {!requestSuccess && (
                        <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-3 space-y-3 sm:space-y-0">
                            <button
                                onClick={handleBackToBrowse}
                                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
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
                                    disabled={!isAvailable || !isAvailabilityChecked || isCheckingAvailability}
                                    className={`px-5 py-2.5 rounded-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                        !isAvailable || !isAvailabilityChecked || isCheckingAvailability
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
                                Your rental request for <span className="font-semibold">{rentalFlowCamera.name}</span> is pending admin approval.
                            </p>
                            <div className="mt-4 p-3 bg-blue-50 rounded text-left text-sm inline-block">
                                <p className="font-medium">Details:</p>
                                <p>Period: {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}</p>
                                <p>Total: <span className="font-semibold">₱{calculatedPrice?.total.toFixed(2)}</span></p>
                                <p>Reference ID: <span className="font-mono">{submittedRentalData.id}</span></p>
                            </div>

                            {/* --- PDF VIEWING SECTION --- */}
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
                                    onClick={handleBackToBrowse}
                                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Browse More Cameras
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* --- CAMERA BROWSER SECTION (Extracted Component) --- */}
      {!rentalFlowCamera && (
        <CameraBrowserSection
          startDate={startDate}
          endDate={endDate}
          isFilterActive={isFilterActive}
          displayedCameras={displayedCameras}
          filterLoading={filterLoading}
          filterError={error}
          onDateChange={handleDateChange}
          onApplyFilter={handleApplyFilter}
          onClearFilter={handleClearFilter}
          onRentClick={handleRentClick}
        />
      )}

      {/* --- CONTRACT SIGNING MODAL (Extracted Component) --- */}
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
      />

    </div>
  );
}