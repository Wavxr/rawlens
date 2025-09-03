import React from 'react';
import { ArrowLeft } from 'lucide-react';

const DesktopRentalLayout = ({ children, onBackToBrowse, camera }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-8 py-4">
          <button
            onClick={onBackToBrowse}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Go back to browse"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Browse
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Panel - Camera Info */}
          <div className="bg-white rounded-2xl shadow-sm border p-8">
            {/* Camera Image */}
            <div className="mb-8">
              {camera?.image_url ? (
                <img
                  src={camera.image_url}
                  alt={camera.name}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                  className="w-full h-80 object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-80 bg-gray-200 flex items-center justify-center rounded-xl">
                  <span className="text-gray-400">No image available</span>
                </div>
              )}
            </div>

            {/* Camera Details */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {camera?.name || "Camera"}
              </h1>
              
              {/* Pricing Tiers */}
              {camera?.camera_pricing_tiers?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Pricing</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">1–3 Days</div>
                      <div className="text-xl font-bold text-blue-600">
                        ₱{camera.camera_pricing_tiers[0]?.price_per_day.toFixed(2)}/day
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">4+ Days</div>
                      <div className="text-xl font-bold text-green-600">
                        ₱{camera.camera_pricing_tiers[1]?.price_per_day.toFixed(2)}/day
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-600 leading-relaxed">
                  {camera?.description || "No description available"}
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel - Rental Form */}
          <div className="bg-white rounded-2xl shadow-sm border p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopRentalLayout;
