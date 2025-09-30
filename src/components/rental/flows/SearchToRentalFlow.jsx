import React, { useEffect } from 'react';
import { Calendar, CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react';
import CameraDetails from '../shared/CameraDetails';
import PricingSummary from '../shared/PricingSummary';
import SuccessView from '../shared/SuccessView';
import ContractSigningModal from '../../modals/ContractSigningModal';
import useCameraStore from '../../../stores/cameraStore';
import useAuthStore from '../../../stores/useAuthStore';

const SearchToRentalFlow = ({ 
  preSelectedDates, 
  onBackToBrowse, 
  isMobile = false,
  availability,
  pricing,
  submission
}) => {
  const { user } = useAuthStore();
  const { rentalFlowCamera, rentalFlowCameraModelName } = useCameraStore();

  // Use shared state from parent
  const {
    isCheckingAvailability,
    isAvailabilityChecked,
    isAvailable,
    availabilityError,
    selectedCameraUnitId,
    checkAvailability,
  } = availability;

  const {
    calculatedPrice,
    pricingError,
    calculateAndSetPrice,
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
  const startDate = preSelectedDates?.startDate;
  const endDate = preSelectedDates?.endDate;

  // Auto-check availability when component mounts
  useEffect(() => {
    const autoCheckAvailability = async () => {
      if (startDate && endDate && cameraModelName && !isAvailabilityChecked) {
        const result = await checkAvailability(cameraModelName, startDate, endDate);
        if (result.success && result.unitId) {
          await calculateAndSetPrice(result.unitId, startDate, endDate);
        }
      }
    };

    autoCheckAvailability();
  }, [startDate, endDate, cameraModelName, checkAvailability, calculateAndSetPrice, isAvailabilityChecked]);

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

        {/* Selected Dates Display */}
        <div className="mb-5">
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
        {/* Header */}
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-2xl font-bold text-gray-900">Book Your Rental</h2>
          <p className="text-sm text-gray-600 mt-1">Select your rental period and complete your booking</p>
        </div>

        {/* Selected Dates Display */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wide">Selected Rental Period</h3>
          <div className="flex items-center text-blue-800">
            <Calendar className="mr-2 h-5 w-5" />
            <span className="font-medium">
              {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        <CameraDetails camera={rentalFlowCamera} isMobile={false} calculatedPrice={calculatedPrice} />

        {/* Availability Status */}
        {isCheckingAvailability && (
          <div className="flex items-center text-blue-600">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Checking availability for selected dates...
          </div>
        )}

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

        {/* Action Button */}
        <div className="flex justify-end pt-6">
          {(isSubmitting || isGeneratingContract) ? (
            <div className="px-6 py-3 flex items-center justify-center">
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              <span className="text-lg">Processing Request...</span>
            </div>
          ) : isCheckingAvailability ? (
            <div className="px-6 py-3 flex items-center justify-center">
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              <span className="text-lg">Checking Availability...</span>
            </div>
          ) : isAvailabilityChecked && isAvailable ? (
            <button
              onClick={handleRentClick}
              className="px-6 py-3 rounded-lg flex items-center justify-center text-base font-medium bg-[#052844] hover:bg-[#063a5e] text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#052844] shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
            >
              <FileText className="mr-3 h-5 w-5" />
              Rent Now
            </button>
          ) : (
            <div className="px-6 py-3 text-gray-500">
              Please wait while we check availability...
            </div>
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

export default SearchToRentalFlow;
