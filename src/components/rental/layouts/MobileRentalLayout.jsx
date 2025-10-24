import { ArrowLeft, Camera } from 'lucide-react';

const MobileRentalLayout = ({ children, onBackToBrowse, camera, footer }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Section */}
      <div className="bg-gray-100 flex flex-col items-center pt-4">
        {/* Back Button */}
        <div className="w-full px-4 mb-4">
          <button
            onClick={onBackToBrowse}
            className="bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition"
            aria-label="Go back to browse"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Camera Image */}
        {camera?.image_url ? (
          <img
            src={camera.image_url}
            alt={camera.name}
            onError={(e) => {
              e.target.style.display = "none";
            }}
            className="max-h-46 h-36 object-cover"
          />
        ) : (
          <div className="w-full max-h-36 h-36 bg-gray-200 flex items-center justify-center rounded-lg shadow-sm">
            <Camera className="h-12 w-12 text-gray-400" />
          </div>
        )}
      </div>

      {/* Bottom Section: White Background */}
      <div className="bg-white rounded-t-2xl mt-4 p-4 sm:p-6 shadow-md flex-grow">
        {/* Camera Name */}
        <h1 className="text-xl font-bold text-gray-900 mb-3">
          {camera?.name || "Camera"}
        </h1>

        {/* Pricing Section */}
        {camera?.camera_pricing_tiers?.length > 0 && (
          <div className="mb-5">
            <div className="grid grid-cols-2 gap-3 text-center">
              {/* 1–3 Days */}
              <div>
                <div className="text-xs text-gray-500 mb-1">1–3 Days</div>
                <div className="text-sm font-semibold">
                  ₱{camera.camera_pricing_tiers[0]?.price_per_day.toFixed(2)}/day
                </div>
              </div>

              {/* 4+ Days */}
              <div>
                <div className="text-xs text-gray-500 mb-1">4+ Days</div>
                <div className="text-sm font-semibold">
                  ₱{camera.camera_pricing_tiers[1]?.price_per_day.toFixed(2)}/day
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {children}
      </div>

      {/* Mobile Footer - Removed the extra wrapper */}
      {footer}
    </div>
  );
};

export default MobileRentalLayout;