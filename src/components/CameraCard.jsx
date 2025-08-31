import React, { useEffect, useState } from 'react';
import { Camera, Tag, Heart, Calendar } from 'lucide-react';
import { calculateTotalPrice, calculateRentalDays } from '../services/rentalService';

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
    // Optional: Add a placeholder or default image
    // e.target.src = '/default-camera-placeholder.png';
  };

  return (
    <div 
      onClick={() => onRentClick(camera)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-200 hover:border-gray-300 group"
    >
      {/* Image Container */}
      <div className="relative aspect-video overflow-hidden bg-gray-50">
        {camera.image_url ? (
          <img
            src={camera.image_url}
            alt={camera.name}
            onError={handleImageError}
            className="w-full h-full object-contain transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="h-10 w-10 text-gray-300" />
          </div>
        )}
        
        {/* Favorite button overlay */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteClick(camera.id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-200 ease-in-out backdrop-blur-sm ${
            isFavorite 
              ? 'bg-red-500/90 text-white shadow-md' 
              : 'bg-white/80 text-gray-600 hover:bg-white shadow-sm'
          }`}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      
      {/* Content Section */}
      <div className="p-4 pt-3">
        <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight">
          {camera.name}
        </h3>
        
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0"> {/* min-w-0 prevents flex item from overflowing */}
            {hasDateRange ? (
              // Show pricing with date range using calculateTotalPrice
              <div className="space-y-1">
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="mr-1.5 h-3 w-3 flex-shrink-0" />
                  <span>{rentalDays} day{rentalDays !== 1 ? 's' : ''}</span>
                </div>
                {loadingPrice ? (
                  <div className="space-y-1">
                    <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-5 w-1/2 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ) : pricingInfo ? (
                  <div>
                    <p className="text-sm text-gray-600 truncate">
                      ₱{pricingInfo.pricePerDay.toFixed(2)}/day
                    </p>
                    <p className="text-lg font-bold text-gray-900 truncate">
                      ₱{pricingInfo.totalPrice.toFixed(2)} <span className="text-sm font-normal text-gray-500">total</span>
                    </p>
                    {/* Show discount only if there are multiple pricing tiers and we're not using the first (shortest duration) tier */}
                    {camera.camera_pricing_tiers && 
                     camera.camera_pricing_tiers.length > 1 && 
                     rentalDays > (camera.camera_pricing_tiers[0]?.max_days || camera.camera_pricing_tiers[0]?.min_days || 0) && (
                      <p className="text-xs text-blue-600 font-medium truncate">
                        Discounted rate
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Pricing unavailable</p>
                )}
              </div>
            ) : (
              // Show regular pricing without date range
              <div>
                <div className="flex items-center text-xs text-gray-500 mb-1">
                  <Tag className="mr-1.5 h-3 w-3 flex-shrink-0" />
                  <span>Starting At</span>
                </div>
                {camera.camera_pricing_tiers && camera.camera_pricing_tiers.length > 0 ? (
                  <p className="text-lg font-bold text-gray-900">
                    ₱{camera.camera_pricing_tiers[0].price_per_day.toFixed(2)}
                  </p>
                ) : (
                  <p className="text-gray-500 text-sm">Contact for price</p>
                )}
              </div>
            )}
          </div>
          
          <div className="ml-3 flex-shrink-0">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
              Available
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraCard;