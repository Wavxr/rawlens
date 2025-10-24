import React, { useEffect, useState } from 'react';
import { Camera, Tag, Calendar, Package, Info } from 'lucide-react';
import { calculateTotalPrice, calculateRentalDays } from '../../services/rentalService';
import { getCameraWithInclusions } from '../../services/inclusionService';

const CameraCardBig = ({ camera, onRentClick, startDate, endDate }) => {
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

  return (
    <div 
      onClick={() => onRentClick(camera)}
      className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-200 hover:border-gray-300 group flex flex-col h-full"
    >
      {/* Image Container */}
      <div className="relative aspect-video overflow-hidden bg-gray-50">
        {camera.image_url ? (
          <img
            src={camera.image_url}
            alt={camera.name}
            onError={handleImageError}
            className="w-full h-full object-contain transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="h-12 w-12 text-gray-300" />
          </div>
        )}
        
        </div>
      
      {/* Content Section - Using flex-grow to push pricing to bottom */}
      <div className="p-5 flex flex-col flex-grow">
        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2 leading-snug">
          {camera.name}
        </h3>
        
        {/* Description */}
        <div className="mb-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
              {camera.description || 'No description available'}
            </p>
          </div>
        </div>

        {/* Inclusions - Shortened */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Package className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-xs font-medium text-gray-700">Includes</span>
          </div>
          {loadingInclusions ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
              <span className="text-xs text-gray-500">Loading...</span>
            </div>
          ) : inclusions.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {inclusions.slice(0, 3).map((inclusion, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                >
                  {inclusion.quantity > 1 && `${inclusion.quantity}x `}{inclusion.name}
                </span>
              ))}
              {inclusions.length > 3 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
                  +{inclusions.length - 3}
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500">None listed</p>
          )}
        </div>

        {/* Spacer to push pricing to bottom */}
        <div className="flex-grow"></div>

        {/* Pricing and Status - Always at bottom */}
        <div className="flex items-end justify-between pt-3 mt-auto border-t border-gray-100">
          <div className="flex-1 min-w-0">
            {hasDateRange ? (
              // Show pricing with date range using calculateTotalPrice
              <div className="space-y-1.5">
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
                      <p className="text-xs text-[#052844] font-medium">
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
                <div className="flex items-center text-xs text-gray-500 mb-1.5">
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
            <span className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Available
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraCardBig;
