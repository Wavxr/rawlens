// src/components/CameraBrowserSection.jsx
import React from 'react';
import { Filter, Search, X, Calendar, Camera } from 'lucide-react';
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
}) => {
  const handleStartDateChange = (e) => onDateChange(e, 'start');
  const handleEndDateChange = (e) => onDateChange(e, 'end');

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-10 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <Filter className="mr-2 h-5 w-5 text-blue-500" />
              Filter by Availability
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <DateFilterInput
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
                minStartDate={new Date().toISOString().split('T')[0]}
                disabled={filterLoading}
                idPrefix="main-filter"
              />
              <div className="flex items-end space-x-2">
                <button
                  onClick={onApplyFilter}
                  disabled={filterLoading || !startDate || !endDate}
                  className={`flex-1 flex items-center justify-center px-5 py-3 rounded-lg font-medium transition-colors ${
                    filterLoading || !startDate || !endDate
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
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
                      Find Cameras
                    </>
                  )}
                </button>
                {isFilterActive && (
                  <button
                    onClick={onClearFilter}
                    className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    title="Clear Filter"
                    disabled={filterLoading}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {filterError && isFilterActive && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <X className="mr-1.5 h-4 w-4 flex-shrink-0" />
                {filterError}
              </p>
            )}
          </div>
        </div>
      </div>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isFilterActive ? `Available Cameras (${displayedCameras.length})` : 'All Cameras'}
          </h2>
          {isFilterActive && (
            <p className="text-gray-600 text-sm flex items-center">
              <Calendar className="mr-1.5 h-4 w-4" />
              {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
            </p>
          )}
        </div>
        {filterLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : displayedCameras.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedCameras.map((camera) => (
              <CameraCard key={camera.id} camera={camera} onRentClick={onRentClick} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Camera className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No cameras found</h3>
            <p className="mt-2 text-gray-500">
              {isFilterActive
                ? "No cameras are available for the selected dates. Try adjusting your dates."
                : "Please check back later for new arrivals."}
            </p>
            {isFilterActive && (
              <div className="mt-6">
                <button
                  onClick={onClearFilter}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={filterLoading}
                >
                  Clear Filter
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default CameraBrowserSection;