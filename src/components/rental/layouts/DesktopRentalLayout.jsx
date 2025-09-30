"use client"
import { ArrowLeft, Camera } from "lucide-react"

const DesktopRentalLayout = ({ children, onBackToBrowse, camera }) => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="lg:mt-8">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <button
            onClick={onBackToBrowse}
            className="inline-flex items-center gap-2.5 text-neutral-700 hover:text-neutral-900 transition-all duration-200 font-medium group"
            aria-label="Go back to browse"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
            <span>Back to Browse</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left Panel - Camera Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
            {/* Camera Image */}
            <div className="p-8 pb-6">
              {camera?.image_url ? (
                <img
                  src={camera.image_url || "/placeholder.svg"}
                  alt={camera.name}
                  onError={(e) => {
                    e.target.style.display = "none"
                  }}
                  className="w-full h-64 object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-64 bg-neutral-100 flex flex-col items-center justify-center rounded-xl border border-neutral-200">
                  <Camera className="w-16 h-16 text-neutral-400 mb-3" />
                  <span className="text-sm text-neutral-500 font-medium">No image available</span>
                </div>
              )}
            </div>

            {/* Camera Details */}
            <div className="px-8 pb-8 space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-neutral-900 leading-tight">{camera?.name || "Camera"}</h1>
              </div>

              {/* Pricing Tiers */}
              {camera?.camera_pricing_tiers?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 mb-4 uppercase tracking-wide">Pricing</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6 hover:border-neutral-300 transition-colors duration-200 flex flex-col">
                      <div className="text-xs font-medium text-neutral-600 mb-2 uppercase tracking-wide">1–3 Days</div>
                      <div className="text-2xl font-bold text-neutral-900">
                        ₱{camera.camera_pricing_tiers[0]?.price_per_day.toFixed(2)}
                      </div>
                      <div className="text-xs text-neutral-500 mt-1">per day</div>
                    </div>
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 hover:border-blue-300 transition-colors duration-200 relative flex flex-col">
                      <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        Best Value
                      </div>
                      <div className="text-xs font-medium text-blue-700 mb-2 uppercase tracking-wide">4+ Days</div>
                      <div className="text-2xl font-bold text-blue-700">
                        ₱{camera.camera_pricing_tiers[1]?.price_per_day.toFixed(2)}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">per day</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              {camera?.description && (
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 mb-3 uppercase tracking-wide">Description</h3>
                  <p className="text-base text-neutral-700 leading-relaxed">{camera.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Rental Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 hover:shadow-md transition-shadow duration-300 h-fit sticky top-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DesktopRentalLayout
