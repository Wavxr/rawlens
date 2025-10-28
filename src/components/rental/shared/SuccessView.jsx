"use client"
import { CheckCircle, Loader2, FileText, Eye } from "lucide-react"

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
  onOpenPdfInNewTab,
}) => {
  const displayCameraName = camera?.name || "Camera"

  return (
    <div className="text-center px-2 sm:px-0">
      <div className="mx-auto flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-blue-50 mb-3 sm:mb-4">
        <CheckCircle className="h-6 w-6 sm:h-7 sm:w-7 text-[#052844]" />
      </div>
      <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-2">Request Submitted!</h3>
      <p className="text-neutral-600 mb-4 sm:mb-6 text-xs sm:text-sm leading-relaxed">
        Your rental request for <span className="font-semibold">{displayCameraName}</span> is pending admin approval.
      </p>

      <div className="bg-neutral-50 rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6 text-left border border-neutral-200">
        <h4 className="font-semibold text-neutral-900 mb-3 sm:mb-4 text-xs sm:text-sm uppercase tracking-wide">Rental Details</h4>
        <div className="space-y-2 sm:space-y-3">
          <p className="text-xs sm:text-sm">
            <span className="font-medium text-neutral-600">Period:</span>{" "}
            <span className="text-neutral-900 break-words">
              {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
            </span>
          </p>
          <p className="text-xs sm:text-sm">
            <span className="font-medium text-neutral-600">Total:</span>{" "}
            <span className="text-lg sm:text-xl font-bold text-[#052844]">
              {calculatedPrice?.total !== undefined ? `₱${calculatedPrice.total.toFixed(2)}` : "N/A"}
            </span>
          </p>
          <p className="text-xs sm:text-sm">
            <span className="font-medium text-neutral-600">Reference ID:</span>{" "}
            <span className="font-mono text-[10px] sm:text-xs bg-white px-2 py-1 rounded border border-neutral-200 break-all">
              {submittedRentalData.id}
            </span>
          </p>
        </div>
      </div>

      {/* Contract PDF Section */}
      <div className="mb-4 sm:mb-6">
        <h4 className="font-semibold text-neutral-800 mb-3 sm:mb-4 flex items-center justify-center text-xs sm:text-sm uppercase tracking-wide">
          <FileText className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 text-neutral-600" />
          Your Rental Agreement
        </h4>
        
        {/* Document Upload Status Indicator */}
        {!submittedRentalData.contract_pdf_url && !pdfViewError && (
          <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 animate-spin flex-shrink-0" />
              <div className="text-left">
                <p className="text-xs sm:text-sm font-semibold text-blue-900">Preparing Your Contract...</p>
                <p className="text-[10px] sm:text-xs text-blue-700 mt-1">
                  Your rental agreement is being generated and uploaded. This usually takes a few seconds.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Document Ready Indicator */}
        {submittedRentalData.contract_pdf_url && !pdfSignedUrl && !isGeneratingPdfUrl && (
          <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-green-50 border-2 border-green-200 rounded-xl">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
              <div className="text-left">
                <p className="text-xs sm:text-sm font-semibold text-green-900">Contract Ready!</p>
                <p className="text-[10px] sm:text-xs text-green-700 mt-1">
                  Your rental agreement is ready to view. Click the button below to open it.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {pdfViewError && (
          <div className="mb-3 p-2.5 sm:p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs sm:text-sm">{pdfViewError}</div>
        )}
        {pdfSignedUrl ? (
          <div className="space-y-2 sm:space-y-3">
            <div className="w-full h-40 sm:h-48 border border-neutral-300 rounded-2xl overflow-hidden shadow-sm">
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
              className="flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 bg-[#052844] text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-[#063a5e] transition-all duration-200 mx-auto shadow-sm hover:shadow-md"
              disabled={isGeneratingPdfUrl}
            >
              <Eye className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Open in New Tab
            </button>
          </div>
        ) : submittedRentalData.contract_pdf_url ? (
          <button
            onClick={() => onViewPdf(submittedRentalData.contract_pdf_url)}
            disabled={isGeneratingPdfUrl}
            className={`flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all duration-200 mx-auto text-xs sm:text-sm font-semibold shadow-sm ${
              isGeneratingPdfUrl
                ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                : "bg-[#052844] text-white hover:bg-[#063a5e] hover:shadow-md"
            }`}
          >
            {isGeneratingPdfUrl ? (
              <>
                <Loader2 className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                Preparing Document...
              </>
            ) : (
              <>
                <Eye className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                View Contract
              </>
            )}
          </button>
        ) : null}
      </div>

      <p className="text-neutral-600 mb-4 sm:mb-6 text-xs sm:text-sm">You will be notified once the admin confirms your booking.</p>
      <button
        onClick={onBackToBrowse}
        className="px-5 sm:px-6 py-2.5 sm:py-3 bg-[#052844] text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-[#063a5e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#052844] transition-all duration-200 shadow-sm hover:shadow-md"
      >
        Browse More Cameras
      </button>
    </div>
  )
}

export default SuccessView
