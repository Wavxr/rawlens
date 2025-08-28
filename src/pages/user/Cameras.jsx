// src/pages/user/Cameras.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getAllCameras, getAvailableCamerasForDates } from '../../services/cameraService';
import { getCameraWithInclusions } from '../../services/inclusionService';
import ContractSigningModal from '../../components/ContractSigningModal';
import CameraBrowserSection from '../../components/CameraBrowserSection';
import RentalFlowSection from '../../components/RentalFlowSection';
import useCameraStore from '../../stores/cameraStore';
import { X, Camera, Bell } from 'lucide-react';

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
    <div className="min-h-screen lg:max-w-6xl lg:mx-auto lg:px-8">
      {/* Header Section - Mobile First */}
        <div className="px-4 py-4 ">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-lg font-semibold text-gray-900">Hello👋, John Davis</p>
              <p className="text-sm text-gray-600 flex items-center">
                📍 United Kingdom
              </p>
            </div>
            <button className="p-2 text-gray-600 hover:text-gray-800 bg-gray-100 rounded-lg">
              <Bell size={20} />
            </button>
          </div>
          
          {/* Promo Banner */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-white text-sm font-medium mb-2">Get high quality images with expert lenses</p>
                <button className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                  Get It Now
                </button>
              </div>
              <div className="ml-4">
                <Camera className="text-white opacity-20" size={32} />
              </div>
            </div>
          </div>

          {/* Top Brands */}
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Top Brands</h3>
            <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
              {['Canon', 'Sony', 'Fujifilm', 'Nikon', 'GoPro'].map((brand) => (
                <button
                  key={brand}
                  className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                    brand === 'Nikon' 
                      ? 'bg-blue-900 text-white shadow-lg' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>

          {/* Category Navigation */}
          <div className="mb-2">
            <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
              {['Cameras', 'Lenses', 'Tripods', 'Lighting', 'Accessories'].map((category) => (
                <button
                  key={category}
                  className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                    category === 'Cameras'
                      ? 'bg-blue-100 text-blue-900 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      
      {/* Main Content */}
      <div className="px-4 py-6 lg:max-w-6xl lg:mx-auto lg:px-8">
        {/* --- RENTAL FLOW SECTION --- */}
        {rentalFlowCamera && (
          <RentalFlowSection onBackToBrowse={handleBackToBrowse} />
        )}

        {/* --- CAMERA BROWSER SECTION --- */}
        {!rentalFlowCamera && (
          <CameraBrowserSection
            startDate={startDate}
            endDate={endDate}
            isFilterActive={isFilterActive}
            displayedCameras={displayedCameras}
            filterLoading={filterLoading}
            filterError={error}
            onDateChange={handleBrowseDateChange}
            onApplyFilter={handleApplyFilter}
            onClearFilter={handleClearFilter}
            onRentClick={handleRentClick}
          />
        )}
      </div>
    </div>
  );
}