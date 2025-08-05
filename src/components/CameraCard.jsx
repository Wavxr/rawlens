// src/components/CameraCard.jsx
import React from 'react';
import { Camera, Tag } from 'lucide-react';

const CameraCard = ({ camera, onRentClick }) => {
  return (
    <div key={camera.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 group">
      {camera.image_url ? (
        <div className="relative overflow-hidden">
          <img
            src={camera.image_url}
            alt={camera.name}
            onError={(e) => {
              console.error(`Error loading image for camera ${camera.id}:`, camera.image_url);
              e.target.style.display = 'none';
            }}
            className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <Camera className="h-12 w-12 text-gray-400" />
        </div>
      )}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-gray-900 truncate">{camera.name}</h3>
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{camera.description}</p>
        <div className="mt-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
            <Tag className="mr-1 h-3 w-3" />
            Starting At
          </h4>
          {camera.camera_pricing_tiers && camera.camera_pricing_tiers.length > 0 ? (
            <p className="text-lg font-bold text-gray-900">
              ₱{Math.min(...camera.camera_pricing_tiers.map(t => t.price_per_day)).toFixed(2)}/day
            </p>
          ) : (
            <p className="text-gray-500 text-sm">Pricing not available</p>
          )}
        </div>
        {camera.inclusions && camera.inclusions.length > 0 && (
          <div className="mt-3">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Includes</h4>
            <ul className="mt-1 flex flex-wrap gap-1">
              {camera.inclusions.slice(0, 3).map((inclusion) => (
                <li key={`${inclusion.inclusion_item_id}-${inclusion.inclusion_items?.id}`} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                  {inclusion.inclusion_items?.name}
                  {inclusion.quantity > 1 ? ` (x${inclusion.quantity})` : ''}
                </li>
              ))}
              {camera.inclusions.length > 3 && (
                <li className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  +{camera.inclusions.length - 3} more
                </li>
              )}
            </ul>
          </div>
        )}
        <button
          onClick={() => onRentClick(camera)}
          className="mt-6 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition duration-300 ease-in-out transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm hover:shadow-md"
        >
          Rent Now
        </button>
      </div>
    </div>
  );
};

export default CameraCard;