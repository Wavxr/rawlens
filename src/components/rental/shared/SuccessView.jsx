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
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-blue-50 mb-4">
        <CheckCircle className="h-7 w-7 text-[#052844]" />
      </div>
      <h3 className="text-2xl font-bold text-neutral-900 mb-2">Request Submitted!</h3>
      <p className="text-neutral-600 mb-6 text-sm leading-relaxed">
        Your rental request for <span className="font-semibold">{displayCameraName}</span> is pending admin approval.
      </p>

      <div className="bg-neutral-50 rounded-2xl p-5 mb-6 text-left border border-neutral-200">
        <h4 className="font-semibold text-neutral-900 mb-4 text-sm uppercase tracking-wide">Rental Details</h4>
        <div className="space-y-3">
          <p className="text-sm">
            <span className="font-medium text-neutral-600">Period:</span>{" "}
            <span className="text-neutral-900">
              {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
            </span>
          </p>
          <p className="text-sm">
            <span className="font-medium text-neutral-600">Total:</span>{" "}
            <span className="text-xl font-bold text-[#052844]">
              {calculatedPrice?.total !== undefined ? `₱${calculatedPrice.total.toFixed(2)}` : "N/A"}
            </span>
          </p>
          <p className="text-sm">
            <span className="font-medium text-neutral-600">Reference ID:</span>{" "}
            <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-neutral-200">
              {submittedRentalData.id}
            </span>
          </p>
        </div>
      </div>

      {/* Contract PDF Section */}
      <div className="mb-6">
        <h4 className="font-semibold text-neutral-800 mb-4 flex items-center justify-center text-sm uppercase tracking-wide">
          <FileText className="mr-2 h-5 w-5 text-neutral-600" />
          Your Rental Agreement
        </h4>
        {pdfViewError && (
          <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm">{pdfViewError}</div>
        )}
        {pdfSignedUrl ? (
          <div className="space-y-3">
            <div className="w-full h-48 border border-neutral-300 rounded-2xl overflow-hidden shadow-sm">
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
              className="flex items-center justify-center px-5 py-2.5 bg-[#052844] text-white text-sm font-semibold rounded-xl hover:bg-[#063a5e] transition-all duration-200 mx-auto shadow-sm hover:shadow-md"
              disabled={isGeneratingPdfUrl}
            >
              <Eye className="mr-2 h-4 w-4" />
              Open in New Tab
            </button>
          </div>
        ) : (
          <button
            onClick={() => onViewPdf(submittedRentalData.contract_pdf_url)}
            disabled={isGeneratingPdfUrl}
            className={`flex items-center justify-center px-5 py-2.5 rounded-xl transition-all duration-200 mx-auto text-sm font-semibold shadow-sm ${
              isGeneratingPdfUrl
                ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                : "bg-[#052844] text-white hover:bg-[#063a5e] hover:shadow-md"
            }`}
          >
            {isGeneratingPdfUrl ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparing Document...
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                View Contract
              </>
            )}
          </button>
        )}
      </div>

      <p className="text-neutral-600 mb-6 text-sm">You will be notified once the admin confirms your booking.</p>
      <button
        onClick={onBackToBrowse}
        className="px-6 py-3 bg-[#052844] text-white text-sm font-semibold rounded-xl hover:bg-[#063a5e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#052844] transition-all duration-200 shadow-sm hover:shadow-md"
      >
        Browse More Cameras
      </button>
    </div>
  )
}

export default SuccessView
