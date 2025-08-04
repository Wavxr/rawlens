// src/pages/user/Cameras.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllCameras, getCamera } from '../../services/cameraService';
import { getCameraWithInclusions } from '../../services/inclusionService';
import { getAvailableCamerasForDates } from '../../services/calendarService';
import { checkCameraAvailability, createUserRentalRequest } from '../../services/rentalService';
import { Camera, Calendar, Clock, Tag, Search, Filter, X, FileText, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

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
              console.warn(`Failed to fetch inclusions for camera ${trimmedCamera.id}:`, inclusionsError);
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
        console.error('Error fetching cameras:', err);
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
      console.error("Filtering failed:", err);
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
      console.error("Availability check failed:", err);
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
        console.error("Price calculation failed:", err);
        setAvailabilityError("Failed to calculate rental price.");
    }
  };

  const handleSignContract = () => {
    if (isAvailable && isAvailabilityChecked && calculatedPrice) {
        setShowContractModal(true);
    } else {
        setRequestError("Please confirm availability and price before signing.");
    }
  };

  const handleSubmitRentalRequest = async () => {
    if (!rentalFlowCamera || !startDate || !endDate || !calculatedPrice) {
      setRequestError("Missing rental information.");
      setShowContractModal(false);
      return;
    }
    if (!isAvailabilityChecked || !isAvailable) {
      setRequestError("Please confirm camera availability first.");
      setShowContractModal(false);
      return;
    }
    setRequestError('');
    setIsSubmitting(true);
    setShowContractModal(false);
    try {
      const { isAvailable: finalCheck } = await checkCameraAvailability(rentalFlowCamera.id, startDate, endDate);
      if (!finalCheck) {
        throw new Error("Camera is no longer available. Please select different dates.");
      }
      const dummyContractUrl = `https://rawlens.example.com/contracts/dummy_${Date.now()}_${rentalFlowCamera.id}.pdf`;
      const { error } = await createUserRentalRequest({
        cameraId: rentalFlowCamera.id,
        startDate,
        endDate,
        contractPdfUrl: dummyContractUrl,
        customerInfo: {
            name: "User Name",
            contact: "User Contact",
            email: "user@example.com"
        }
      });
      if (error) throw new Error(error.message || "Failed to submit rental request.");
      setRequestSuccess(true);
    } catch (err) {
      console.error("Rental request failed:", err);
      setRequestError(err.message || "An error occurred while submitting your request. Please try again.");
    } finally {
      setIsSubmitting(false);
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
      
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Discover the Perfect Camera</h1>
        <p className="mt-2 text-gray-600">Browse our collection and find the ideal gear for your next shoot.</p>
      </div>

      {/* Rental Confirmation Section */}
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
                                  console.error(`Error loading image for rental flow camera ${rentalFlowCamera.id}:`, rentalFlowCamera.image_url);
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
                        </div>
                    )}
                    {requestError && !requestSuccess && (
                        <div className="mt-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                            {requestError}
                        </div>
                    )}
                    {requestSuccess && (
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
                            </div>
                            <p className="mt-4 text-gray-600">
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

      {/* Camera Browser Section */}
      {!rentalFlowCamera && (
        <>
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-10 border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <Filter className="mr-2 h-5 w-5 text-blue-500" />
                  Filter by Availability
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2">
                    <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <Calendar className="mr-1.5 h-4 w-4" />
                      Rental Period
                    </label>
                    <div className="flex">
                      <input
                        type="date"
                        id="start-date"
                        value={startDate}
                        onChange={(e) => handleDateChange(e, 'start')}
                        className="flex-1 min-w-0 p-3 border border-r-0 border-gray-300 rounded-l-lg focus:ring-blue-500 focus:border-blue-500"
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <div className="bg-gray-100 border border-gray-300 border-l-0 border-r-0 px-3 flex items-center">
                        <span className="text-gray-500">to</span>
                      </div>
                      <input
                        type="date"
                        id="end-date"
                        value={endDate}
                        onChange={(e) => handleDateChange(e, 'end')}
                        className="flex-1 min-w-0 p-3 border border-l-0 border-gray-300 rounded-r-lg focus:ring-blue-500 focus:border-blue-500"
                        min={startDate ? new Date(new Date(startDate).getTime() + 86400000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                        disabled={!startDate}
                      />
                    </div>
                  </div>
                  <div className="flex items-end space-x-2">
                    <button
                      onClick={handleApplyFilter}
                      disabled={filterLoading || !startDate || !endDate}
                      className={`flex-1 flex items-center justify-center px-5 py-3 rounded-lg font-medium transition-colors ${
                        filterLoading || !startDate || !endDate
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                      }`}
                    >
                      {filterLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Find Cameras
                        </>
                      )}
                    </button>
                    {isFilterActive && (
                      <button
                        onClick={handleClearFilter}
                        className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                        title="Clear Filter"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                {error && isFilterActive && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <X className="mr-1.5 h-4 w-4 flex-shrink-0" />
                    {error}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {isFilterActive ? `Available Cameras (${displayedCameras.length})` : 'All Cameras'}
              </h2>
              {isFilterActive && (
                <p className="text-gray-600 text-sm flex items-center">
                  <Calendar className="mr-1.5 h-4 w-4" />
                  {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                </p>
              )}
            </div>
            {filterLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : displayedCameras.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayedCameras.map((camera) => (
                  <div key={camera.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 group">
                    {camera.image_url ? (
                      <div className="relative overflow-hidden">
                        <img
                          src={camera.image_url}
                          alt={camera.name}
                          onError={(e) => {
                            console.error(`Error loading image for camera ${camera.id}:`, camera.image_url);
                            e.target.style.display = 'none';
                          }}
                          className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <Camera className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{camera.name}</h3>
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">{camera.description}</p>
                      <div className="mt-4">
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
                          <Tag className="mr-1 h-3 w-3" />
                          Starting At
                        </h4>
                        {camera.camera_pricing_tiers && camera.camera_pricing_tiers.length > 0 ? (
                          <p className="text-lg font-bold text-gray-900">
                            ₱{Math.min(...camera.camera_pricing_tiers.map(t => t.price_per_day)).toFixed(2)}/day
                          </p>
                        ) : (
                          <p className="text-gray-500 text-sm">Pricing not available</p>
                        )}
                      </div>
                      {camera.inclusions && camera.inclusions.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Includes</h4>
                          <ul className="mt-1 flex flex-wrap gap-1">
                            {camera.inclusions.slice(0, 3).map((inclusion) => (
                              <li key={`${inclusion.inclusion_item_id}-${inclusion.inclusion_items?.id}`} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                {inclusion.inclusion_items?.name}
                                {inclusion.quantity > 1 ? ` (x${inclusion.quantity})` : ''}
                              </li>
                            ))}
                            {camera.inclusions.length > 3 && (
                              <li className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                +{camera.inclusions.length - 3} more
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                      <button
                        onClick={() => handleRentClick(camera)}
                        className="mt-6 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition duration-300 ease-in-out transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm hover:shadow-md"
                      >
                        Rent Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                <Camera className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No cameras found</h3>
                <p className="mt-2 text-gray-500">
                  {isFilterActive
                    ? "No cameras are available for the selected dates. Try adjusting your dates."
                    : "Please check back later for new arrivals."}
                </p>
                {isFilterActive && (
                  <div className="mt-6">
                    <button
                      onClick={handleClearFilter}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Clear Filter
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Contract Modal */}
      {showContractModal && rentalFlowCamera && calculatedPrice && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Rental Agreement</h2>
                <button
                  onClick={() => setShowContractModal(false)}
                  disabled={isSubmitting}
                  className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">Rental Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="font-medium">Camera:</span>
                  <span>{rentalFlowCamera.name}</span>
                  <span className="font-medium">Rental Period:</span>
                  <span>{new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}</span>
                  <span className="font-medium">Duration:</span>
                  <span>{calculatedPrice.days} days</span>
                  <span className="font-medium">Total Price:</span>
                  <span className="font-bold text-lg">₱{calculatedPrice.total.toFixed(2)}</span>
                </div>
              </div>
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">Terms & Conditions</h3>
                <div className="border border-gray-300 rounded-lg p-4 h-48 overflow-y-auto text-sm text-gray-700 bg-gray-50">
                  <p className="mb-3"><strong>1. Rental Period:</strong> The rental period begins on the start date and ends on the end date specified above.</p>
                  <p className="mb-3"><strong>2. Equipment Care:</strong> You are responsible for the equipment during the rental period. Please handle it with care.</p>
                  <p className="mb-3"><strong>3. Damage/Loss:</strong> You are liable for any damage or loss to the equipment beyond normal wear and tear.</p>
                  <p className="mb-3"><strong>4. Return:</strong> The equipment must be returned in the same condition as received, on or before the end date.</p>
                  <p className="mb-3"><strong>5. Late Returns:</strong> Late returns will incur additional daily fees.</p>
                  <p className="mb-3"><strong>6. Insurance:</strong> Consider obtaining insurance for valuable equipment.</p>
                  <p className="mb-3"><strong>7. Cancellation:</strong> Cancellations must be made 48 hours prior to the rental start date for a full refund.</p>
                  <p><strong>8. Acceptance:</strong> By signing below, you agree to these terms and the rental price.</p>
                </div>
              </div>
              <div className="flex items-center mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="flex-shrink-0 mr-3 h-5 w-5 text-yellow-600" />
                <p className="text-sm text-yellow-700">
                  <span className="font-semibold">Note:</span> This is a simulation. In a real application, you would sign a legally binding document.
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowContractModal(false)}
                  disabled={isSubmitting}
                  className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitRentalRequest}
                  disabled={isSubmitting}
                  className={`px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center disabled:opacity-50`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting Request...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      I Agree & Confirm Rental
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}