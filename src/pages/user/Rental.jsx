// src/pages/user/Rental.jsx
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import RentalFlowSection from '../../components/rental/RentalFlowSection';
import useCameraStore from '../../stores/cameraStore';

export default function Rental() {
  const navigate = useNavigate();
  const location = useLocation();
  const { camera, sourcePageType = "home", preSelectedDates = null } = location.state || {};
  
  // Get the store functions and state
  const { 
    resetBrowseFilter, 
    rentalFlowCamera, 
    rentalFlowCameraModelName,
    setRentalFlowCamera,
    setRentalFlowCameraModelName 
  } = useCameraStore();

  // Set camera data in store if it comes from location.state but store is empty
  useEffect(() => {
    if (camera && (!rentalFlowCamera || !rentalFlowCameraModelName)) {
      setRentalFlowCamera(camera);
      setRentalFlowCameraModelName(camera.name);
    }
  }, [camera, rentalFlowCamera, rentalFlowCameraModelName, setRentalFlowCamera, setRentalFlowCameraModelName]);

  // Clear date filters when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      // This cleanup function runs when the component unmounts
      resetBrowseFilter();
    };
  }, [resetBrowseFilter]);

  const handleBackToBrowse = () => {
    // Clear date filters when going back
    resetBrowseFilter();
    
    // Navigate back to the source page
    if (sourcePageType === "search") {
      navigate('/user/search');
    } else {
      navigate('/user/home');
    }
  };

  // If no camera data in both location.state and store, redirect back to home
  if (!camera && !rentalFlowCamera && !rentalFlowCameraModelName) {
    navigate('/user/home');
    return null;
  }

  return (
    <div className="lg:max-w-6xl lg:mx-auto lg:px-8">
      <div className="px-4 py-6">
        <RentalFlowSection 
          onBackToBrowse={handleBackToBrowse}
          sourcePageType={sourcePageType}
          preSelectedDates={preSelectedDates}
        />
      </div>
    </div>
  );
}
