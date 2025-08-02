// src/pages/user/Rent.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient'; // Assuming you have this
import { getAvailableCamerasForDates } from '../../services/calendarService';
import { getCameraWithPricing } from '../../services/cameraService';
import { getCameraWithInclusions } from '../../services/inclusionService';
import { checkCameraAvailability, createUserRentalRequest } from '../../services/rentalService';

const UserRent = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // State variables
  const [step, setStep] = useState('select_dates'); // 'select_dates', 'select_camera', 'confirm_details', 'request_submitted'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preselectedCameraId, setPreselectedCameraId] = useState(null);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isAvailabilityChecked, setIsAvailabilityChecked] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [calculatedPrice, setCalculatedPrice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Check for preselected camera ID on component mount
  useEffect(() => {
    const cameraIdFromParams = searchParams.get('cameraId');
    if (cameraIdFromParams) {
      setPreselectedCameraId(cameraIdFromParams);
      setStep('confirm_details');
      fetchCameraDetails(cameraIdFromParams);
    }
  }, [searchParams]);

  // Helper to fetch full camera details (pricing & inclusions)
  const fetchCameraDetails = async (cameraId) => {
    try {
      const [pricingRes, inclusionRes] = await Promise.all([
        getCameraWithPricing(cameraId),
        getCameraWithInclusions(cameraId)
      ]);

      if (pricingRes.error) throw new Error(pricingRes.error.message);
      if (inclusionRes.error) throw new Error(inclusionRes.error.message);

      const cameraData = pricingRes.data;
      const inclusionData = inclusionRes.data?.camera_inclusions || [];

      setSelectedCamera({
        ...cameraData,
        inclusions: inclusionData
      });
    } catch (err) {
      console.error("Failed to fetch camera details:", err);
      setRequestError("Failed to load camera details. Please try again.");
      // Optionally, navigate back or show a general error
    }
  };

// Handler for date changes
const handleDateChange = (e, dateType) => {
    if (dateType === 'start') {
      setStartDate(e.target.value);
    } else if (dateType === 'end') {
      setEndDate(e.target.value);
    }

    if (step === 'confirm_details') {
      setIsAvailabilityChecked(false);
      setIsAvailable(false);
      setCalculatedPrice(null);
      setAvailabilityError('');
    } else if (step === 'select_camera') {
      if (!preselectedCameraId) {
        setAvailableCameras([]);
        setSelectedCamera(null);
        setStep('select_dates');
      }
    }
    
    if (step === 'select_dates') {
         setAvailabilityError('');
    }
  };

  // Handler for checking availability (Step 1 for general search, or triggered in confirm_details)
  const handleCheckAvailability = async () => {
    if (!startDate || !endDate) {
      setAvailabilityError("Please select both start and end dates.");
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
      if (step === 'select_dates' && !preselectedCameraId) {
        // General availability search flow
        const { data, error } = await getAvailableCamerasForDates(startDate, endDate);
        if (error) throw new Error(error.message || "Failed to fetch available cameras.");
        setAvailableCameras(data.filter(cam => cam.isAvailable)); // Filter just in case
        setStep('select_camera');
      } else if (step === 'confirm_details' && selectedCamera) {
        // Check availability for the specific selected/preselected camera
        const { isAvailable: avail, error } = await checkCameraAvailability(selectedCamera.id, startDate, endDate);
        if (error) throw new Error(error.message || "Failed to check availability.");
        setIsAvailable(avail);
        if (!avail) {
          setAvailabilityError("Sorry, this camera is no longer available for the selected dates.");
        } else {
            // Calculate price only if available
            calculateAndSetPrice(selectedCamera.id, startDate, endDate);
        }
        setIsAvailabilityChecked(true);
      }
    } catch (err) {
      console.error("Availability check failed:", err);
      setAvailabilityError(err.message || "An error occurred while checking availability.");
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  // Helper function to calculate and set the price
  const calculateAndSetPrice = async (cameraId, start, end) => {
     // Calculate rental days
     const startD = new Date(start);
     const endD = new Date(end);
     const timeDiff = endD.getTime() - startD.getTime();
     const rentalDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

     if (rentalDays <= 0) {
         setAvailabilityError("Invalid rental period.");
         return;
     }

     try {
         // Get pricing tiers
         const { data: tiers, error: tierError } = await getCameraWithPricing(cameraId);
         if (tierError) throw new Error(tierError.message);

         const applicableTier = tiers.camera_pricing_tiers.find(tier =>
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

  // Handler for selecting a camera from the list (general search flow)
  const handleSelectCamera = async (camera) => {
    setSelectedCamera(camera); // Set basic info first
    setStep('confirm_details');
    // Fetch full details for the selected camera
    await fetchCameraDetails(camera.id);
    // Reset availability check for the newly selected camera
    setIsAvailabilityChecked(false);
    setIsAvailable(false);
    setCalculatedPrice(null);
  };

  // Handler for submitting the rental request
  const handleSubmitRentalRequest = async () => {
    if (!selectedCamera || !startDate || !endDate) {
      setRequestError("Missing rental information.");
      return;
    }
    if (!isAvailabilityChecked || !isAvailable) {
      setRequestError("Please confirm camera availability first.");
      return;
    }
    if (!calculatedPrice) {
        setRequestError("Price calculation is missing.");
        return;
    }

    setRequestError('');
    setIsSubmitting(true);

    try {
      // Final availability check before submitting
      const { isAvailable: finalCheck } = await checkCameraAvailability(selectedCamera.id, startDate, endDate);
      if (!finalCheck) {
        throw new Error("Camera is no longer available. Please select different dates.");
      }

      // Submit the rental request
      const { error } = await createUserRentalRequest({
        cameraId: selectedCamera.id,
        startDate,
        endDate
        // total_price is calculated by the service
      });

      if (error) throw new Error(error.message || "Failed to submit rental request.");

      setRequestSuccess(true);
      setStep('request_submitted');
      // Optionally navigate to profile or show a success message page
      // navigate('/user/profile'); // Example navigation
    } catch (err) {
      console.error("Rental request failed:", err);
      setRequestError(err.message || "An error occurred while submitting your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render logic based on the current step
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Rent a Camera</h1>

      {/* Step 1 & 2: Date Selection and Camera Selection (General Flow) or Direct Camera Confirmation */}
      {(step === 'select_dates' || step === 'select_camera' || step === 'confirm_details') && (
        <div className="mb-8 p-4 border rounded">
          <h2 className="text-xl font-semibold mb-4">
            {step === 'select_dates' ? '1. Select Rental Dates' :
             step === 'select_camera' ? '2. Select an Available Camera' :
             'Confirm Rental Details'}
          </h2>

          {/* Date Pickers - Shown in select_dates and confirm_details */}
          {(step === 'select_dates' || step === 'confirm_details') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  id="start-date"
                  value={startDate}
                  onChange={(e) => handleDateChange(e, 'start')}
                  className="w-full p-2 border rounded"
                  min={new Date().toISOString().split('T')[0]} // Prevent past dates
                />
              </div>
              <div>
                <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  id="end-date"
                  value={endDate}
                  onChange={(e) => handleDateChange(e, 'end')}
                  className="w-full p-2 border rounded"
                  min={startDate ? new Date(new Date(startDate).getTime() + 86400000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} // Min is start date + 1 day
                  disabled={!startDate} // Disable until start date is selected
                />
              </div>
            </div>
          )}

          {/* Availability Check Button */}
          <button
            onClick={handleCheckAvailability}
            disabled={isCheckingAvailability || !startDate || !endDate}
            className={`px-4 py-2 rounded ${
              isCheckingAvailability || !startDate || !endDate
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-700 text-white'
            }`}
          >
            {isCheckingAvailability ? 'Checking...' : (step === 'select_dates' ? 'Find Available Cameras' : 'Check Camera Availability')}
          </button>

          {/* Availability Error Message */}
          {availabilityError && (
            <div className="mt-2 text-red-500">{availabilityError}</div>
          )}

          {/* Step 2: Select Camera from List (General Search Flow) */}
          {step === 'select_camera' && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Available Cameras:</h3>
              {availableCameras.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableCameras.map((camera) => (
                    <div key={camera.id} className="border p-3 rounded shadow-sm hover:shadow-md transition-shadow">
                      {camera.image_url && (
                        <img src={camera.image_url} alt={camera.name} className="w-full h-32 object-cover mb-2 rounded" />
                      )}
                      <h4 className="font-medium">{camera.name}</h4>
                      <button
                        onClick={() => handleSelectCamera(camera)}
                        className="mt-2 px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded"
                      >
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No cameras are available for the selected dates.</p>
              )}
            </div>
          )}

          {/* Step 3: Confirm Details (for both flows) */}
          {step === 'confirm_details' && selectedCamera && (
            <div className="mt-6">
              {/* Selected Camera Info */}
              <div className="border p-4 rounded mb-4">
                <h3 className="text-lg font-semibold mb-2">Camera: {selectedCamera.name}</h3>
                {selectedCamera.image_url && (
                  <img src={selectedCamera.image_url} alt={selectedCamera.name} className="w-full max-w-xs h-40 object-cover mb-3 rounded" />
                )}
                <p className="text-gray-600 mb-2">{selectedCamera.description}</p>

                {/* Selected Dates */}
                <div className="mb-3">
                  <p className="font-medium">Rental Period:</p>
                  <p>{startDate} to {endDate}</p>
                </div>

                {/* Availability Status & Price (only shown after check) */}
                {isAvailabilityChecked && (
                  <div className="mb-3">
                    {isAvailable ? (
                      <div>
                        <p className="text-green-600 font-medium">✓ Camera is available for these dates!</p>
                        {calculatedPrice && (
                          <div className="mt-2">
                            <p className="font-medium">Rental Cost Breakdown:</p>
                            <p>{calculatedPrice.days} days x ₱{calculatedPrice.pricePerDay.toFixed(2)}/day = <span className="font-bold">₱{calculatedPrice.total.toFixed(2)}</span></p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-red-500">✗ {availabilityError || "Camera is not available."}</p>
                    )}
                  </div>
                )}

                {/* Inclusions */}
                {selectedCamera.inclusions && selectedCamera.inclusions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Includes:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {selectedCamera.inclusions.map((inclusion) => (
                        <li key={inclusion.inclusion_item_id}>
                          {inclusion.inclusion_items?.name}
                          {inclusion.quantity > 1 ? ` (x${inclusion.quantity})` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitRentalRequest}
                disabled={isSubmitting || !isAvailable || !isAvailabilityChecked}
                className={`px-4 py-2 rounded ${
                  isSubmitting || !isAvailable || !isAvailabilityChecked
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-700 text-white'
                }`}
              >
                {isSubmitting ? 'Submitting Request...' : 'Confirm Rental Request'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Request Submitted */}
      {step === 'request_submitted' && requestSuccess && (
        <div className="p-6 text-center border rounded bg-green-50">
          <h2 className="text-2xl font-bold text-green-700 mb-2">Request Submitted!</h2>
          <p className="mb-4">Your rental request for <span className="font-semibold">{selectedCamera?.name}</span> is pending admin approval.</p>
          <p className="text-gray-600">You will be notified once the admin confirms your booking.</p>
          <button
            onClick={() => navigate('/user/profile')}
            className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white rounded"
          >
            View Request Status
          </button>
        </div>
      )}

      {/* General Error Message for Request Submission */}
      {requestError && step !== 'select_dates' && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {requestError}
        </div>
      )}
    </div>
  );
};

export default UserRent;