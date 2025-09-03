import React from 'react';
import useIsMobile from '../../hooks/useIsMobile';
import useCameraStore from '../../stores/cameraStore';
import useAuthStore from '../../stores/useAuthStore';
import DesktopRentalLayout from './layouts/DesktopRentalLayout';
import MobileRentalLayout from './layouts/MobileRentalLayout';
import HomeToRentalFlow from './flows/HomeToRentalFlow';
import SearchToRentalFlow from './flows/SearchToRentalFlow';
import MobileRentalFooter from './shared/MobileRentalFooter';
import useRentalAvailability from '../../hooks/useRentalAvailability';
import useRentalPricing from '../../hooks/useRentalPricing';
import useRentalSubmission from '../../hooks/useRentalSubmission';

const RentalFlowSection = ({ onBackToBrowse, sourcePageType = "home", preSelectedDates = null }) => {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const {
    rentalFlowCamera,
    rentalFlowCameraModelName,
    startDate,
    endDate,
    handleRentalFlowDateChange,
  } = useCameraStore();

  // For mobile footer - needed for both flows
  const {
    isCheckingAvailability,
    isAvailabilityChecked,
    isAvailable,
    availabilityError,
    selectedCameraUnitId,
    checkAvailability,
    setAvailabilityError,
  } = useRentalAvailability(user);

  const {
    calculatedPrice,
    pricingError,
    calculateAndSetPrice,
  } = useRentalPricing();

  const {
    isSubmitting,
    requestSuccess,
    isGeneratingContract,
    handleRentNow,
    submitRentalRequest,
    requestError,
    submittedRentalData,
    showContractModal,
    pdfSignedUrl,
    isGeneratingPdfUrl,
    pdfViewError,
    sigCanvasRef,
    handleViewPdf,
    handleOpenPdfInNewTab,
    setShowContractModal,
    setRequestError,
  } = useRentalSubmission(user);

  if (!rentalFlowCamera && !rentalFlowCameraModelName) {
    return null;
  }

  const cameraModelName = rentalFlowCameraModelName || rentalFlowCamera?.name;

  // Mobile footer handlers (only for HomeToRentalFlow)
  const handleMobileDateChange = (newStartDate, newEndDate) => {
    handleRentalFlowDateChange({ target: { value: newStartDate } }, 'start');
    handleRentalFlowDateChange({ target: { value: newEndDate } }, 'end');
  };

  const handleMobileCheckAvailability = async () => {
    const effectiveStartDate = preSelectedDates?.startDate || startDate;
    const effectiveEndDate = preSelectedDates?.endDate || endDate;

    if (!effectiveStartDate || !effectiveEndDate) {
      setAvailabilityError("Please select both start and end dates.");
      return;
    }

    const result = await checkAvailability(cameraModelName, effectiveStartDate, effectiveEndDate);
    if (result.success && result.unitId) {
      await calculateAndSetPrice(result.unitId, effectiveStartDate, effectiveEndDate);
    }
  };

  const handleMobileCheckAvailabilityWithDates = async (newStartDate, newEndDate) => {
    if (!newStartDate || !newEndDate) {
      setAvailabilityError("Please select both start and end dates.");
      return;
    }

    const result = await checkAvailability(cameraModelName, newStartDate, newEndDate);
    if (result.success && result.unitId) {
      await calculateAndSetPrice(result.unitId, newStartDate, newEndDate);
    }
  };

  const handleMobileRentNow = () => {
    handleRentNow(isAvailable, isAvailabilityChecked, calculatedPrice);
  };

  // Create a shared handleSubmitRental function for mobile footers
  const handleMobileSubmitRental = async (signatureDataUrl) => {
    await submitRentalRequest(signatureDataUrl, {
      selectedCameraUnitId,
      cameraModelName,
      startDate: preSelectedDates?.startDate || startDate,
      endDate: preSelectedDates?.endDate || endDate,
      calculatedPrice,
    });
  };

  // Render content based on source page type
  const renderContent = () => {
    const sharedProps = {
      onBackToBrowse,
      isMobile,
      // Share the hook states with flow components
      availability: {
        isCheckingAvailability,
        isAvailabilityChecked,
        isAvailable,
        availabilityError,
        selectedCameraUnitId,
        checkAvailability,
        setAvailabilityError,
      },
      pricing: {
        calculatedPrice,
        pricingError,
        calculateAndSetPrice,
      },
      submission: {
        isSubmitting,
        requestSuccess,
        isGeneratingContract,
        handleRentNow,
        submitRentalRequest,
        requestError,
        submittedRentalData,
        showContractModal,
        pdfSignedUrl,
        isGeneratingPdfUrl,
        pdfViewError,
        sigCanvasRef,
        handleViewPdf,
        handleOpenPdfInNewTab,
        setShowContractModal,
        setRequestError,
      },
    };

    if (sourcePageType === 'search') {
      return (
        <SearchToRentalFlow
          preSelectedDates={preSelectedDates}
          {...sharedProps}
        />
      );
    }
    
    return (
      <HomeToRentalFlow
        {...sharedProps}
      />
    );
  };

  // Mobile footer for both flows (when not successful)
  const renderMobileFooter = () => {
    if (!requestSuccess) {
      if (sourcePageType === 'home') {
        return (
          <MobileRentalFooter
            calculatedPrice={calculatedPrice}
            isCheckingAvailability={isCheckingAvailability}
            isAvailabilityChecked={isAvailabilityChecked}
            isAvailable={isAvailable}
            isSubmitting={isSubmitting}
            isGeneratingContract={isGeneratingContract}
            availabilityError={availabilityError}
            startDate={startDate}
            endDate={endDate}
            onDateChange={handleMobileDateChange}
            onCheckAvailability={handleMobileCheckAvailability}
            onCheckAvailabilityWithDates={handleMobileCheckAvailabilityWithDates}
            onRentNow={handleMobileRentNow}
            sourcePageType={sourcePageType}
            preSelectedDates={preSelectedDates}
          />
        );
      } else if (sourcePageType === 'search') {
        // For search, we need to get the availability and pricing state from SearchToRentalFlow
        // We'll pass the necessary props and handlers
        return (
          <MobileRentalFooter
            calculatedPrice={calculatedPrice}
            isCheckingAvailability={isCheckingAvailability}
            isAvailabilityChecked={isAvailabilityChecked}
            isAvailable={isAvailable}
            isSubmitting={isSubmitting}
            isGeneratingContract={isGeneratingContract}
            availabilityError={availabilityError}
            startDate={preSelectedDates?.startDate}
            endDate={preSelectedDates?.endDate}
            onDateChange={handleMobileDateChange}
            onCheckAvailability={handleMobileCheckAvailability}
            onCheckAvailabilityWithDates={null} // Not needed for search flow
            onRentNow={handleMobileRentNow}
            sourcePageType={sourcePageType}
            preSelectedDates={preSelectedDates}
          />
        );
      }
    }
    return null;
  };

  // Render with appropriate layout
  if (isMobile) {
    return (
      <MobileRentalLayout
        onBackToBrowse={onBackToBrowse}
        camera={rentalFlowCamera}
        footer={renderMobileFooter()}
      >
        {renderContent()}
      </MobileRentalLayout>
    );
  }

  return (
    <DesktopRentalLayout
      onBackToBrowse={onBackToBrowse}
      camera={rentalFlowCamera}
    >
      {renderContent()}
    </DesktopRentalLayout>
  );
};

export default RentalFlowSection;
