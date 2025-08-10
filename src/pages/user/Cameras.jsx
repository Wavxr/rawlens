// src/pages/user/Cameras.jsx
import React, { useState, useEffect } from 'react'; // Removed useRef as sigCanvasRef is now local to RentalFlowSection
import { supabase } from '../../lib/supabaseClient';
import { getAllCameras } from '../../services/cameraService';
import { getCameraWithInclusions } from '../../services/inclusionService';
import { getAvailableCamerasForDates } from '../../services/calendarService';
// Removed individual service imports related to rental flow as they are now in RentalFlowSection
import ContractSigningModal from '../../components/ContractSigningModal'; // This might need adjustment depending on how it uses state
import CameraBrowserSection from '../../components/CameraBrowserSection';
import RentalFlowSection from '../../components/RentalFlowSection'; // Import the new component
import useCameraStore from '../../stores/cameraStore'; // Import the store
import { X } from 'lucide-react'; // Keep X for error display

export default function UserCameras() {
  // --- Get state and actions from the store ---
  const {
    // Browsing State
    cameras,
    displayedCameras,
    loading,
    error, // This is the main loading error
    filterLoading,
    startDate,
    endDate,
    isFilterActive,
    // Rental Flow State (for conditional rendering and passing to components)
    rentalFlowCamera,
    // Browsing Actions
    setCameras,
    setDisplayedCameras,
    setLoading,
    setError,
    setFilterLoading,
    setStartDate, // For initial date sync if needed, though handleBrowseDateChange is preferred
    setEndDate,   // For initial date sync if needed, though handleBrowseDateChange is preferred
    setIsFilterActive,
    handleBrowseDateChange, // Use this combined action
    resetBrowseFilter,
    resetStore, // Optional: for full reset on unmount or if needed
  } = useCameraStore();

  // --- Effects ---
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        setLoading(true);
        setError(null); // Clear previous errors
  
        const { data: camerasWithPricing, error: pricingError } = await getAllCameras();
        if (pricingError) {
          throw new Error(pricingError.message);
        }

        const sortedCameras = (camerasWithPricing || []).map(camera => ({
          ...camera,
          camera_pricing_tiers: [...camera.camera_pricing_tiers].sort(
            (a, b) => a.min_days - b.min_days
          )
        }));
  
        const camerasWithFullData = await Promise.all(
          sortedCameras.map(async (camera) => {
            const trimmedCamera = {
              ...camera,
              image_url: camera.image_url ? camera.image_url.trim() : null
            };
            const { data: cameraWithInclusions, error: inclusionsError } =
              await getCameraWithInclusions(trimmedCamera.id);
            if (inclusionsError) {
              console.warn(
                `Error fetching inclusions for camera ${trimmedCamera.id}:`,
                inclusionsError
              );
              return { ...trimmedCamera, inclusions: [] };
            }
            return {
              ...trimmedCamera,
              inclusions: cameraWithInclusions?.camera_inclusions || []
            };
          })
        );
  
        setCameras(camerasWithFullData);
      } catch (err) {
        console.error("Failed to load cameras:", err);
        setError("Failed to load cameras. Please try again later.");
        setDisplayedCameras([]);
      } finally {
        setLoading(false);
      }
    };
  
    fetchCameras();
  }, [setCameras, setDisplayedCameras, setLoading, setError]);
  

  // --- Handlers for CameraBrowserSection ---
  const handleApplyFilter = async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates.");
      return;
    }
    // Validate dates
    const start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
    const end = new Date(new Date(endDate).setHours(0, 0, 0, 0));
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      setError("Please select valid dates. End date must be on or after start date.");
      return;
    }
    setError(''); // Clear previous filter errors
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
      console.error("Error applying filter:", err);
      setError(err.message || "An error occurred while filtering cameras.");
      setDisplayedCameras([]);
    } finally {
      setFilterLoading(false);
    }
  };

  const handleClearFilter = () => {
    resetBrowseFilter(); // Use the store action
    // The store action handles setting startDate, endDate, isFilterActive, displayedCameras, and clearing error
  };

  const handleRentClick = (camera) => {
    // Assuming resetRentalFlowState is called within the store action setRentalFlowCamera
    // or we call it explicitly before setting the camera
    useCameraStore.getState().resetRentalFlowState(); // Call reset action from store
    useCameraStore.getState().setRentalFlowCamera(camera); // Set the camera to trigger RentalFlowSection
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToBrowse = () => {
    useCameraStore.getState().resetRentalFlowState(); // Reset rental flow state in store
    // Optionally, you might want to clear the main filter as well, or keep it.
    // For now, we just clear the rental flow state to go back to browsing.
    // If you want to clear the main filter too:
    // resetBrowseFilter();
  };

  // --- Render Logic ---
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !filterLoading) { // Show main loading error, not filter errors
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
      {/* --- RENTAL FLOW SECTION --- */}
      {/* Show Rental Flow if a camera is selected */}
      {rentalFlowCamera && (
        <RentalFlowSection onBackToBrowse={handleBackToBrowse} />
      )}

      {/* --- CAMERA BROWSER SECTION --- */}
      {/* Show Camera Browser if no camera is selected for rental */}
      {!rentalFlowCamera && (
        <CameraBrowserSection
          startDate={startDate}
          endDate={endDate}
          isFilterActive={isFilterActive}
          displayedCameras={displayedCameras}
          filterLoading={filterLoading}
          filterError={error} // Pass main error state, or a specific filter error if you add one to the store
          onDateChange={handleBrowseDateChange} // Use the combined store action
          onApplyFilter={handleApplyFilter}
          onClearFilter={handleClearFilter}
          onRentClick={handleRentClick}
        />
      )}

    </div>
  );
}