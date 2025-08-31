// src/components/CameraCard.jsx
import React, { useEffect, useState } from 'react';
import { Camera, Tag, Heart, Calendar } from 'lucide-react';
import { calculateTotalPrice } from '../services/rentalService';

const CameraCard = ({ camera, onRentClick, onFavoriteClick, isFavorite, startDate, endDate }) => {
  const [pricingInfo, setPricingInfo] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  // Calculate rental duration in days
  const calculateRentalDays = () => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const rentalDays = calculateRentalDays();
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
  return (
    <div 
      onClick={() => onRentClick(camera)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group"
    >
      <div className="relative overflow-hidden">
        {camera.image_url ? (
          <img
            src={camera.image_url}
            alt={camera.name}
            onError={(e) => {
              console.error(`Error loading image for camera ${camera.id}:`, camera.image_url);
              e.target.style.display = 'none';
            }}
            className="w-full h-40 sm:h-48 object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-40 sm:h-48 bg-gray-100 flex items-center justify-center">
            <Camera className="h-12 w-12 text-gray-400" />
          </div>
        )}
        
        {/* Favorite button overlay */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteClick(camera.id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full transition-colors shadow-sm ${
            isFavorite 
              ? 'bg-red-500 text-white' 
              : 'bg-white/90 text-gray-600 hover:bg-white'
          }`}
        >
          <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 leading-tight">
          {camera.name}
        </h3>
        
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {hasDateRange ? (
              // Show pricing with date range using calculateTotalPrice
              <div className="space-y-2">
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="mr-1 h-3 w-3" />
                  <span>{rentalDays} day{rentalDays !== 1 ? 's' : ''}</span>
                </div>
                {loadingPrice ? (
                  <div className="space-y-1">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ) : pricingInfo ? (
                  <div>
                    <p className="text-sm text-gray-600">
                      ₱{pricingInfo.pricePerDay.toFixed(2)}/day
                    </p>
                    <p className="text-xl font-bold text-green-600">
                      ₱{pricingInfo.totalPrice.toFixed(2)} total
                    </p>
                    {/* Show if there's a discount applied */}
                    {pricingInfo.pricePerDay !== (camera.camera_pricing_tiers?.[0]?.price_per_day || 0) && (
                      <p className="text-xs text-blue-600 font-medium">
                        Discounted rate applied
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
                  <Tag className="mr-1 h-3 w-3" />
                  <span>Starting At</span>
                </div>
                {camera.camera_pricing_tiers && camera.camera_pricing_tiers.length > 0 ? (
                  <p className="text-xl font-bold text-green-600">
                    ₱{camera.camera_pricing_tiers[0].price_per_day.toFixed(2)}
                  </p>
                ) : (
                  <p className="text-gray-500 text-sm">Contact for price</p>
                )}
              </div>
            )}
          </div>
          
          <div className="bg-green-50 px-3 py-1 rounded-full ml-3">
            <span className="text-green-600 text-xs font-medium">Available</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraCard;