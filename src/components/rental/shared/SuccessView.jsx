import React from 'react';
import { CheckCircle, AlertCircle, Loader2, FileText, Eye } from 'lucide-react';

const SuccessView = ({ 
  camera, 
  calculatedPrice, 
  submittedRentalData, 
  startDate, 
  endDate,
  pdfSignedUrl,
  pdfViewError,
  isGeneratingPdfUrl,
  onBackToBrowse,
  onViewPdf,
  onOpenPdfInNewTab 
}) => {
  const displayCameraName = camera?.name || "Camera";

  return (
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-3">
        <CheckCircle className="h-6 w-6 text-green-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h3>
      <p className="text-gray-600 mb-5 text-sm">
        Your rental request for <span className="font-semibold">{displayCameraName}</span> is pending admin approval.
      </p>

      {/* Rental Details */}
      <div className="bg-blue-50 rounded-lg p-4 mb-5 text-left max-w-md mx-auto">
        <h4 className="font-semibold text-gray-900 mb-3 text-sm">Rental Details:</h4>
        <div className="space-y-2">
          <p className="text-sm">
            <span className="font-medium">Period:</span> {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
          </p>
          <p className="text-sm">
            <span className="font-medium">Total:</span> 
            <span className="text-lg font-bold text-green-600">
              {calculatedPrice?.total !== undefined ? `₱${calculatedPrice.total.toFixed(2)}` : 'N/A'}
            </span>
          </p>
          <p className="text-sm">
            <span className="font-medium">Reference ID:</span> 
            <span className="font-mono text-xs bg-white px-1.5 py-0.5 rounded">
              {submittedRentalData.id}
            </span>
          </p>
        </div>
      </div>

      {/* Contract PDF Section */}
      <div className="mb-5">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center justify-center text-base">
          <FileText className="mr-2 h-5 w-5 text-blue-500" />
          Your Rental Agreement
        </h4>
        {pdfViewError && (
          <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
            {pdfViewError}
          </div>
        )}
        {pdfSignedUrl ? (
          <div className="space-y-3">
            <div className="w-full h-48 border border-gray-300 rounded-lg overflow-hidden">
              <iframe
                src={pdfSignedUrl}
                title="Signed Rental Agreement"
                className="w-full h-full"
                onError={() => {
                  // Handle iframe error if needed
                }}
              ></iframe>
            </div>
            <button
              onClick={onOpenPdfInNewTab}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors mx-auto"
              disabled={isGeneratingPdfUrl}
            >
              <Eye className="mr-1.5 h-4 w-4" />
              Open in New Tab
            </button>
          </div>
        ) : (
          <button
            onClick={() => onViewPdf(submittedRentalData.contract_pdf_url)}
            disabled={isGeneratingPdfUrl}
            className={`flex items-center justify-center px-4 py-2 rounded-lg transition-colors mx-auto text-sm ${
              isGeneratingPdfUrl
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isGeneratingPdfUrl ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Preparing Document...
              </>
            ) : (
              <>
                <Eye className="mr-1.5 h-4 w-4" />
                View Contract
              </>
            )}
          </button>
        )}
      </div>

      <p className="text-gray-600 mb-5 text-sm">
        You will be notified once the admin confirms your booking.
      </p>
      <button
        onClick={onBackToBrowse}
        className="px-6 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium transition-all shadow-sm hover:shadow"
      >
        Browse More Cameras
      </button>
    </div>
  );
};

export default SuccessView;
