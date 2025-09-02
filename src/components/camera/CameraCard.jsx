import { useEffect, useState } from 'react';
import { Camera, Tag, Calendar } from 'lucide-react';
import { calculateTotalPrice, calculateRentalDays } from '../../services/rentalService';

const CameraCard = ({ camera, onRentClick, onFavoriteClick, isFavorite, startDate, endDate }) => {
  const [pricingInfo, setPricingInfo] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  // Use the same rental days calculation as the rental service
  const getRentalDays = () => {
    if (!startDate || !endDate) return null;
    try {
      return calculateRentalDays(startDate, endDate);
    } catch (error) {
      console.error('Error calculating rental days:', error);
      return null;
    }
  };

  const rentalDays = getRentalDays();
  const hasDateRange = startDate && endDate && rentalDays;

  // Calculate pricing when dates are provided
  useEffect(() => {
    if (hasDateRange && camera.id) {
      setLoadingPrice(true);
      calculateTotalPrice(camera.id, startDate, endDate)
        .then((result) => {
          setPricingInfo(result);
        })
        .catch((error) => {
          console.error('Error calculating pricing:', error);
          setPricingInfo(null);
        })
        .finally(() => {
          setLoadingPrice(false);
        });
    } else {
      setPricingInfo(null);
    }
  }, [camera.id, startDate, endDate, hasDateRange]);

  // Handle image loading with proper sizing and fallback
  const handleImageError = (e) => {
    e.target.style.display = 'none';
  };

  return (
    <div 
      onClick={() => onRentClick(camera)}
      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-200 hover:border-gray-300 group"
    >
      {/* Image Container - Optimized for small cards */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {camera.image_url ? (
          <img
            src={camera.image_url}
            alt={camera.name}
            onError={handleImageError}
            className="w-full h-full object-contain transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="h-8 w-8 text-gray-300" />
          </div>
        )}
      </div>
      
      {/* Content Section - Compact for mobile */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight">
          {camera.name}
        </h3>
        
        <div className="space-y-2">
          {hasDateRange ? (
            // Show pricing with date range using calculateTotalPrice
            <div className="space-y-1">
              <div className="flex items-center text-xs text-gray-500">
                <Calendar className="mr-1 h-3 w-3 flex-shrink-0" />
                <span>{rentalDays} day{rentalDays !== 1 ? 's' : ''}</span>
              </div>
              {loadingPrice ? (
                <div className="space-y-1">
                  <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : pricingInfo ? (
                <div>
                  <p className="text-xs text-gray-600">
                    ₱{pricingInfo.pricePerDay.toFixed(2)}/day
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    ₱{pricingInfo.totalPrice.toFixed(2)}
                  </p>
                  {/* Show discount only if there are multiple pricing tiers and we're not using the first (shortest duration) tier */}
                  {camera.camera_pricing_tiers && 
                   camera.camera_pricing_tiers.length > 1 && 
                   rentalDays > (camera.camera_pricing_tiers[0]?.max_days || camera.camera_pricing_tiers[0]?.min_days || 0) && (
                    <p className="text-xs text-blue-600 font-medium">
                      Discounted
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-xs">Pricing unavailable</p>
              )}
            </div>
          ) : (
            // Show regular pricing without date range
            <div>
              <div className="flex items-center text-xs text-gray-500 mb-1">
                <Tag className="mr-1 h-3 w-3 flex-shrink-0" />
                <span>From</span>
              </div>
              {camera.camera_pricing_tiers && camera.camera_pricing_tiers.length > 0 ? (
                <p className="text-sm font-bold text-gray-900">
                  ₱{camera.camera_pricing_tiers[0].price_per_day.toFixed(2)}/day
                </p>
              ) : (
                <p className="text-gray-500 text-xs">Contact for price</p>
              )}
            </div>
          )}
          
          {/* Status badge */}
          <div className="pt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
              Available
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraCard;