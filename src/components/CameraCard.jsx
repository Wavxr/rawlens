// src/components/CameraCard.jsx
import React from 'react';
import { Camera, Tag, Heart } from 'lucide-react';

const CameraCard = ({ camera, onRentClick, onFavoriteClick, isFavorite }) => {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="relative overflow-hidden">
        {camera.image_url ? (
          <img
            src={camera.image_url}
            alt={camera.name}
            onError={(e) => {
              console.error(`Error loading image for camera ${camera.id}:`, camera.image_url);
              e.target.style.display = 'none';
            }}
            className="w-full h-48 lg:h-36 object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-48 lg:h-36 bg-gray-100 flex items-center justify-center">
            <Camera className="h-12 w-12 lg:h-8 lg:w-8 text-gray-400" />
          </div>
        )}
        
        {/* Favorite button overlay */}
        <button
          onClick={() => onFavoriteClick(camera.id)}
          className={`absolute top-2 right-2 p-1.5 rounded-full transition-colors ${
            isFavorite 
              ? 'bg-red-500 text-white' 
              : 'bg-white/80 text-gray-600 hover:bg-white'
          }`}
        >
          <Heart size={16} className="lg:w-3 lg:h-3" fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      
      <div className="p-4 lg:p-3">
        <h3 className="text-base lg:text-sm font-semibold text-gray-900 truncate">{camera.name}</h3>
        <p className="mt-1 text-xs lg:text-xs text-gray-600 line-clamp-2">{camera.description}</p>
        
        {/* Show unit count if this is a model representative */}
        {camera.isModelRepresentative && camera.totalUnits > 1 && (
          <p className="mt-1 text-xs text-blue-600 font-medium">
            {camera.totalUnits} units available
          </p>
        )}
        
        <div className="mt-3 lg:mt-2">
          <div className="flex items-center text-xs text-gray-500 mb-1">
            <Tag className="mr-1 h-3 w-3 lg:h-2.5 lg:w-2.5" />
            <span>Starting At</span>
          </div>
          {camera.camera_pricing_tiers && camera.camera_pricing_tiers.length > 0 ? (
            <p className="text-lg lg:text-base font-bold text-gray-900">
              ₱{camera.camera_pricing_tiers[0].price_per_day.toFixed(2)}/day
            </p>
          ) : (
            <p className="text-gray-500 text-sm lg:text-xs">Pricing not available</p>
          )}
        </div>
        
        {camera.inclusions && camera.inclusions.length > 0 && (
          <div className="mt-3 lg:mt-2">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Includes</h4>
            <ul className="mt-1 flex flex-wrap gap-1">
              {camera.inclusions.slice(0, 3).map((inclusion) => (
                <li key={`${inclusion.inclusion_item_id}-${inclusion.inclusion_items?.id}`} className="text-xs lg:text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                  {inclusion.inclusion_items?.name}
                  {inclusion.quantity > 1 ? ` (x${inclusion.quantity})` : ''}
                </li>
              ))}
              {camera.inclusions.length > 3 && (
                <li className="text-xs lg:text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  +{camera.inclusions.length - 3} more
                </li>
              )}
            </ul>
          </div>
        )}
        
        <button
          onClick={() => onRentClick(camera)}
          className="mt-4 lg:mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 lg:py-1.5 px-3 rounded-lg transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm lg:text-xs"
        >
          Rent Now
        </button>
      </div>
    </div>
  );
};

export default CameraCard;