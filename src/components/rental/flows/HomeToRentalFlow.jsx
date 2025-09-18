import React, { useEffect } from 'react';
import { Calendar, CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react';
import DateFilterInput from '../../forms/DateFilterInput';
import CameraDetails from '../shared/CameraDetails';
import PricingSummary from '../shared/PricingSummary';
import SuccessView from '../shared/SuccessView';
import ContractSigningModal from '../../modals/ContractSigningModal';
import useCameraStore from '../../../stores/cameraStore';
import useAuthStore from '../../../stores/useAuthStore';

const HomeToRentalFlow = ({ 
  onBackToBrowse, 
  isMobile = false,
  availability,
  pricing,
  submission
}) => {
  const { user } = useAuthStore();
  const {
    rentalFlowCamera,
    rentalFlowCameraModelName,
    startDate,
    endDate,
    handleRentalFlowDateChange,
  } = useCameraStore();

  // Use shared state from parent
  const {
    isCheckingAvailability,
    isAvailabilityChecked,
    isAvailable,
    availabilityError,
    selectedCameraUnitId,
    checkAvailability,
    setAvailabilityError,
    resetAvailability,
  } = availability;

  const {
    calculatedPrice,
    pricingError,
    calculateAndSetPrice,
    resetPricing,
  } = pricing;

  const {
    isSubmitting,
    requestError,
    requestSuccess,
    submittedRentalData,
    isGeneratingContract,
    showContractModal,
    pdfSignedUrl,
    isGeneratingPdfUrl,
    pdfViewError,
    sigCanvasRef,
    handleRentNow,
    submitRentalRequest,
    handleViewPdf,
    handleOpenPdfInNewTab,
    setShowContractModal,
    setRequestError,
  } = submission;

  const cameraModelName = rentalFlowCameraModelName || rentalFlowCamera?.name;

  // Custom date change handler that resets availability and pricing when dates change
  const handleDateChange = (e, dateType) => {
    // Update the date in the store
    handleRentalFlowDateChange(e, dateType);
    
    // Reset the hooks to clear availability and pricing state
    resetAvailability();
    resetPricing();
  };

  const handleCheckAvailability = async () => {
    if (!startDate || !endDate) {
      setAvailabilityError("Please select both start and end dates.");
      return;
    }

    const result = await checkAvailability(cameraModelName, startDate, endDate);
    if (result.success && result.unitId) {
      await calculateAndSetPrice(result.unitId, startDate, endDate);
    }
  };

  const handleSubmitRental = async (signatureDataUrl) => {
    await submitRentalRequest(signatureDataUrl, {
      selectedCameraUnitId,
      cameraModelName,
      startDate,
      endDate,
      calculatedPrice,
    });
  };

  const handleRentClick = () => {
    handleRentNow(isAvailable, isAvailabilityChecked, calculatedPrice);
  };

  if (requestSuccess) {
    return (
      <SuccessView
        camera={rentalFlowCamera}
        calculatedPrice={calculatedPrice}
        submittedRentalData={submittedRentalData}
        startDate={startDate}
        endDate={endDate}
        pdfSignedUrl={pdfSignedUrl}
        pdfViewError={pdfViewError}
        isGeneratingPdfUrl={isGeneratingPdfUrl}
        onBackToBrowse={onBackToBrowse}
        onViewPdf={handleViewPdf}
        onOpenPdfInNewTab={handleOpenPdfInNewTab}
      />
    );
  }

  if (isMobile) {
    return (
      <>
        <CameraDetails camera={rentalFlowCamera} isMobile={true} />

        {/* Mobile Date Display - Only show after dates are confirmed */}
        <div className="mb-2 lg:hidden">
          {startDate && endDate && (
            <>
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

        <PricingSummary calculatedPrice={calculatedPrice} isMobile={true} />

        {/* Error Messages */}
        {(availabilityError || pricingError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5">
            <div className="flex items-start text-red-600 text-sm">
              <AlertCircle className="flex-shrink-0 mr-2 mt-0.5 h-4 w-4" />
              <div>
                <h4 className="font-medium mb-1">Error</h4>
                <span>{availabilityError || pricingError}</span>
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

        <ContractSigningModal
          isOpen={showContractModal}
          onClose={() => setShowContractModal(false)}
          camera={rentalFlowCamera}
          startDate={startDate}
          endDate={endDate}
          calculatedPrice={calculatedPrice}
          onSubmitRequest={handleSubmitRental}
          isSubmitting={isSubmitting}
          isGeneratingContract={isGeneratingContract}
          sigCanvasRef={sigCanvasRef}
        />
      </>
    );
  }

  // Desktop version
  return (
    <>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Rental Details</h2>

        {/* Date Selection */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Select Rental Period</h3>
          <DateFilterInput
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={(e) => handleDateChange(e, 'start')}
            onEndDateChange={(e) => handleDateChange(e, 'end')}
            minStartDate={new Date().toISOString().split('T')[0]}
            disabled={isCheckingAvailability || isSubmitting || isGeneratingContract}
            label=""
            idPrefix="rental-flow-desktop"
          />
        </div>

        <CameraDetails camera={rentalFlowCamera} isMobile={false} />

        {/* Availability Indicator */}
        {isAvailabilityChecked && isAvailable && (
          <div className="flex items-center text-green-600">
            <CheckCircle className="h-5 w-5 mr-2" />
            Available for selected dates
          </div>
        )}

        <PricingSummary calculatedPrice={calculatedPrice} isMobile={false} />

        {/* Error Messages */}
        {(availabilityError || pricingError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start text-red-600">
              <AlertCircle className="flex-shrink-0 mr-2 mt-0.5 h-5 w-5" />
              <div>
                <h4 className="font-medium mb-1">Error</h4>
                <span>{availabilityError || pricingError}</span>
              </div>
            </div>
          </div>
        )}

        {requestError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start text-red-600">
              <AlertCircle className="flex-shrink-0 mr-2 mt-0.5 h-5 w-5" />
              <div>
                <h4 className="font-medium mb-1">Request Failed</h4>
                <span>{requestError}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-6">
          {(isSubmitting || isGeneratingContract) ? (
            <div className="px-6 py-3 flex items-center justify-center">
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              <span className="text-lg">Processing Request...</span>
            </div>
          ) : !isAvailabilityChecked || !isAvailable ? (
            <button
              onClick={handleCheckAvailability}
              disabled={isCheckingAvailability || !startDate || !endDate}
              className={`flex items-center px-6 py-3 rounded-lg text-base font-medium transition-all ${
                isCheckingAvailability || !startDate || !endDate
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
              onClick={handleRentClick}
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

      <ContractSigningModal
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        camera={rentalFlowCamera}
        startDate={startDate}
        endDate={endDate}
        calculatedPrice={calculatedPrice}
        onSubmitRequest={handleSubmitRental}
        isSubmitting={isSubmitting}
        isGeneratingContract={isGeneratingContract}
        sigCanvasRef={sigCanvasRef}
      />
    </>
  );
};

export default HomeToRentalFlow;
