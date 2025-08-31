import React, { useEffect, useState } from 'react';
import { Camera, Tag, Heart, Calendar, Package, Info } from 'lucide-react';
import { calculateTotalPrice, calculateRentalDays } from '../services/rentalService';
import { getCameraWithInclusions } from '../services/inclusionService';

const CameraCardBig = ({ camera, onRentClick, onFavoriteClick, isFavorite, startDate, endDate }) => {
  const [pricingInfo, setPricingInfo] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [inclusions, setInclusions] = useState([]);
  const [loadingInclusions, setLoadingInclusions] = useState(false);

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

  // Fetch inclusions for this camera
  useEffect(() => {
    if (camera.id) {
      setLoadingInclusions(true);
      getCameraWithInclusions(camera.id)
        .then((result) => {
          if (result.data && result.data.camera_inclusions) {
            const inclusionsList = result.data.camera_inclusions.map(ci => ({
              name: ci.inclusion_items.name,
              quantity: ci.quantity
            }));
            setInclusions(inclusionsList);
          } else {
            setInclusions([]);
          }
        })
        .catch((error) => {
          console.error('Error fetching inclusions:', error);
          setInclusions([]);
        })
        .finally(() => {
          setLoadingInclusions(false);
        });
    }
  }, [camera.id]);

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

  // Truncate description to a reasonable length
  const truncateDescription = (text, maxLength = 120) => {
    if (!text) return 'No description available';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  return (
    <div 
      onClick={() => onRentClick(camera)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200 hover:border-gray-300 group"
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
            <Camera className="h-12 w-12 text-gray-300" />
          </div>
        )}
        
        {/* Favorite button overlay */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteClick(camera.id);
          }}
          className={`absolute top-4 right-4 p-2.5 rounded-full transition-all duration-200 ease-in-out backdrop-blur-sm ${
            isFavorite 
              ? 'bg-red-500/90 text-white shadow-md' 
              : 'bg-white/80 text-gray-600 hover:bg-white shadow-sm'
          }`}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      
      {/* Content Section */}
      <div className="p-5">
        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2 leading-tight">
          {camera.name}
        </h3>
        
        {/* Description */}
        <div className="mb-4">
          <div className="flex items-start gap-2 mb-2">
            <Info className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600 leading-relaxed">
              {truncateDescription(camera.description)}
            </p>
          </div>
        </div>

        {/* Inclusions */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700">What's Included</span>
          </div>
          {loadingInclusions ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
              <span className="text-xs text-gray-500">Loading inclusions...</span>
            </div>
          ) : inclusions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {inclusions.slice(0, 4).map((inclusion, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                >
                  {inclusion.quantity > 1 && `${inclusion.quantity}x `}{inclusion.name}
                </span>
              ))}
              {inclusions.length > 4 && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
                  +{inclusions.length - 4} more
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No inclusions listed</p>
          )}
        </div>

        {/* Pricing and Status */}
        <div className="flex items-end justify-between">
          <div className="flex-1 min-w-0">
            {hasDateRange ? (
              // Show pricing with date range using calculateTotalPrice
              <div className="space-y-2">
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="mr-1.5 h-3 w-3 flex-shrink-0" />
                  <span>{rentalDays} day{rentalDays !== 1 ? 's' : ''}</span>
                </div>
                {loadingPrice ? (
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-6 w-1/2 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ) : pricingInfo ? (
                  <div>
                    <p className="text-sm text-gray-600">
                      ₱{pricingInfo.pricePerDay.toFixed(2)}/day
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      ₱{pricingInfo.totalPrice.toFixed(2)} <span className="text-sm font-normal text-gray-500">total</span>
                    </p>
                    {/* Show discount only if there are multiple pricing tiers and we're not using the first (shortest duration) tier */}
                    {camera.camera_pricing_tiers && 
                     camera.camera_pricing_tiers.length > 1 && 
                     rentalDays > (camera.camera_pricing_tiers[0]?.max_days || camera.camera_pricing_tiers[0]?.min_days || 0) && (
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
                <div className="flex items-center text-xs text-gray-500 mb-2">
                  <Tag className="mr-1.5 h-3 w-3 flex-shrink-0" />
                  <span>Starting At</span>
                </div>
                {camera.camera_pricing_tiers && camera.camera_pricing_tiers.length > 0 ? (
                  <p className="text-xl font-bold text-gray-900">
                    ₱{camera.camera_pricing_tiers[0].price_per_day.toFixed(2)}
                    <span className="text-sm font-normal text-gray-500 ml-1">/day</span>
                  </p>
                ) : (
                  <p className="text-gray-500 text-sm">Contact for price</p>
                )}
              </div>
            )}
          </div>
          
          <div className="ml-4 flex-shrink-0">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
              Available
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraCardBig;
