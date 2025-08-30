// src/components/CameraBrowserSection.jsx
import React from 'react';
import { Filter, Search, X, Calendar, Camera, Heart } from 'lucide-react';
import DateFilterInput from './DateFilterInput';
import CameraCard from './CameraCard';

const CameraBrowserSection = ({
  startDate,
  endDate,
  isFilterActive,
  displayedCameras,
  filterLoading,
  filterError, 
  onDateChange, 
  onApplyFilter, 
  onClearFilter,
  onRentClick,
  onFavoriteClick,
  favorites,
}) => {
  const handleStartDateChange = (e) => onDateChange(e, 'start');
  const handleEndDateChange = (e) => onDateChange(e, 'end');

  return (
    <div className="space-y-6">
      {/* Date Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 lg:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Filter className="mr-2 h-5 w-5 text-blue-900" />
            Find Available Cameras
          </h2>
          
          <div className="space-y-3">
            <DateFilterInput
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={handleStartDateChange}
              onEndDateChange={handleEndDateChange}
              minStartDate={new Date().toISOString().split('T')[0]}
              disabled={filterLoading}
              idPrefix="main-filter"
            />
            
            <div className="flex items-center space-x-2">
              <button
                onClick={onApplyFilter}
                disabled={filterLoading || !startDate || !endDate}
                className={`flex-1 lg:flex-none lg:px-8 flex items-center justify-center px-4 py-3 rounded-xl font-medium transition-all text-sm ${
                  filterLoading || !startDate || !endDate
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-900 hover:bg-blue-800 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
                }`}
              >
                {filterLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Find Available Cameras
                  </>
                )}
              </button>
              {isFilterActive && (
                <button
                  onClick={onClearFilter}
                  className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
                  title="Clear Filter"
                  disabled={filterLoading}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {filterError && isFilterActive && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600 flex items-center">
                  <X className="mr-2 h-4 w-4 flex-shrink-0" />
                  {filterError}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">
          {isFilterActive ? `Available Camera Models (${displayedCameras.length})` : 'Camera Models'}
        </h2>
        {isFilterActive && (
          <p className="text-gray-600 text-xs flex items-center">
            <Calendar className="mr-1 h-3.5 w-3.5" />
            {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Camera grid */}
      {filterLoading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : displayedCameras.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {displayedCameras.map((camera) => (
            <CameraCard
              key={camera.id}
              camera={camera}
              onRentClick={onRentClick}
              onFavoriteClick={onFavoriteClick}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Camera className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-3 text-base font-medium text-gray-900">No camera models found</h3>
          <p className="mt-1 text-gray-500 text-sm">
            {isFilterActive
              ? "No camera models are available for the selected dates. Try adjusting your dates."
              : "Please check back later for new arrivals."}
          </p>
          {isFilterActive && (
            <div className="mt-4">
              <button
                onClick={onClearFilter}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                disabled={filterLoading}
              >
                Clear Filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CameraBrowserSection;