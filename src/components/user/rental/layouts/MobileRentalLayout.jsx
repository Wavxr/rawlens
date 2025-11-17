import { ArrowLeft, Camera } from 'lucide-react';

const MobileRentalLayout = ({ children, onBackToBrowse, camera, footer }) => {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Top Section */}
      <div className="bg-white relative">
        {/* Back Button - Floating overlay */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={onBackToBrowse}
            className="bg-white/95 backdrop-blur-sm rounded-full p-2.5 shadow-lg hover:bg-white hover:scale-105 active:scale-95 transition-all duration-200"
            aria-label="Go back to browse"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-900" strokeWidth={2.5} />
          </button>
        </div>

        {/* Camera Image */}
        <div className="pt-4 pb-6">
          {camera?.image_url ? (
            <img
              src={camera.image_url}
              alt={camera.name}
              onError={(e) => {
                e.target.style.display = "none";
              }}
              className="w-full h-64 object-contain px-8"
            />
          ) : (
            <div className="w-full h-64 bg-neutral-100 flex items-center justify-center">
              <Camera className="h-16 w-16 text-neutral-300" strokeWidth={1.5} />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Content Card */}
      <div className="bg-white rounded-t-3xl -mt-4 p-5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex-grow">
        {/* Camera Name */}
        <h1 className="text-2xl font-bold text-neutral-900 mb-1 tracking-tight">
          {camera?.name || "Camera"}
        </h1>

        {/* Pricing Section */}
        {camera?.camera_pricing_tiers?.length > 0 && (
          <div className="mb-6 mt-4">
            <div className="grid grid-cols-2 gap-3">
              {/* 1–3 Days */}
              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200">
                <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1.5">
                  1–3 Days
                </div>
                <div className="text-lg font-bold text-neutral-900">
                  ₱{camera.camera_pricing_tiers[0]?.price_per_day.toFixed(2)}
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">per day</div>
              </div>

              {/* 4+ Days (Best Value) */}
              <div className="relative bg-blue-50 rounded-2xl p-4 border-2 border-blue-200 hover:border-blue-300 transition-colors duration-200">
                <div className="absolute top-1.5 right-1.5 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  Best Value
                </div>
                <div className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1.5">
                  4+ Days
                </div>
                <div className="text-lg font-bold text-blue-700">
                  ₱{camera.camera_pricing_tiers[1]?.price_per_day.toFixed(2)}
                </div>
                <div className="text-xs text-blue-600 mt-0.5">per day</div>
              </div>
            </div>
          </div>
        )}


        {/* Content */}
        {children}
      </div>

      {/* Mobile Footer */}
      {footer}
    </div>
  );
};

export default MobileRentalLayout;