// src/pages/user/Search.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Filter, Calendar, X, Info } from 'lucide-react';
import CameraCard from '@components/user/camera/CameraCard';
import CameraCardBig from '@components/user/camera/CameraCardBig';
import DateFilterInput from '@components/user/forms/DateFilterInput';
import useCameraStore from '@stores/cameraStore';
import { getAvailableCamerasForDates } from '@services/cameraService';

export default function Search() {
  const navigate = useNavigate();
  
  // Store state and actions
  const {
    error,
    filterLoading,
    startDate,
    endDate,
    isFilterActive,
    setDisplayedCameras,
    setError,
    setFilterLoading,
    setIsFilterActive,
    handleBrowseDateChange,
    resetBrowseFilter,
    resetRentalFlowState,
    setRentalFlowCameraModelName,
    setRentalFlowCamera,
  } = useCameraStore();

  const [favorites, setFavorites] = useState(new Set());
  const [searchResults, setSearchResults] = useState([]);

  // Clear date filters when component unmounts
  useEffect(() => {
    return () => resetBrowseFilter();
  }, [resetBrowseFilter]);

  // Clear search results when dates change
  useEffect(() => {
    setSearchResults([]);
    setDisplayedCameras([]);
    setIsFilterActive(false);
    setError('');
  }, [startDate, endDate, setDisplayedCameras, setError, setIsFilterActive]);

  // Event handlers
  const handleDateChange = (e, type) => handleBrowseDateChange(e, type);

  const handleApplyFilter = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    // Validate dates
    const start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
    const end = new Date(new Date(endDate).setHours(0, 0, 0, 0));
    
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      setError('Please select valid dates with end date after start date');
      return;
    }

    setError('');
    setFilterLoading(true);
    
    try {
      const { data: availableCameras, error: fetchError } = await getAvailableCamerasForDates(startDate, endDate);
      
      if (fetchError) {
        throw new Error(fetchError);
      }
      setSearchResults(availableCameras || []);
      setDisplayedCameras(availableCameras || []);
      setIsFilterActive(true);
    } catch (error) {
      console.error('Error checking camera availability:', error);
      setError('Failed to search cameras. Please try again.');
      setSearchResults([]);
      setDisplayedCameras([]);
    } finally {
      setFilterLoading(false);
    }
  };

  const handleClearFilter = () => {
    resetBrowseFilter();
    setSearchResults([]);
  };

  const handleRentClick = (cameraModel) => {
    resetRentalFlowState();
    setRentalFlowCameraModelName(cameraModel.name);
    setRentalFlowCamera(cameraModel);
    
    navigate('/user/rental', {
      state: {
        camera: cameraModel,
        sourcePageType: "search",
        preSelectedDates: { startDate, endDate }
      }
    });
  };

  const handleFavoriteClick = (cameraId) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(cameraId)) {
        newFavorites.delete(cameraId);
      } else {
        newFavorites.add(cameraId);
      }
      return newFavorites;
    });
  };

  const handleStartDateChange = (e) => handleDateChange(e, 'start');
  const handleEndDateChange = (e) => handleDateChange(e, 'end');

  return (
    <div className="min-h-[calc(100vh-4rem)] ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Page Header */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Find Available Cameras</h1>
          <p className="text-sm lg:text-base text-gray-600 mt-1">Select your rental dates to see available camera models</p>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Filter Sidebar */}
          <div className="lg:w-80 lg:shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 sticky top-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base lg:text-lg font-semibold text-gray-900 flex items-center">
                  <Filter className="mr-2 h-5 w-5 text-[#052844]" />
                  Search Filters
                </h2>
                {isFilterActive && (
                  <button
                    onClick={handleClearFilter}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-150"
                    title="Clear Search"
                    disabled={filterLoading}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                    Rental Dates
                  </h3>
                  <DateFilterInput
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={handleStartDateChange}
                    onEndDateChange={handleEndDateChange}
                    disabled={filterLoading}
                    idPrefix="search-filter"
                  />
                </div>
                
                <div className="pt-2">
                  <button
                    onClick={handleApplyFilter}
                    disabled={filterLoading || !startDate || !endDate}
                    className={`w-full flex items-center justify-center px-5 py-3 rounded-lg font-semibold transition-all duration-150 text-sm ${
                      filterLoading || !startDate || !endDate
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-[#052844] hover:bg-[#063a5e] text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                    }`}
                  >
                    {filterLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        Searching...
                      </>
                    ) : (
                      <>
                        <SearchIcon className="mr-2 h-4 w-4" />
                        Search Cameras
                      </>
                    )}
                  </button>
                </div>
                
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 flex items-center">
                      <X className="mr-2 h-4 w-4 flex-shrink-0" />
                      {error}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search Results */}
          <div className="flex-1">
            {!isFilterActive ? (
              /* Empty Search State */
              <div className="bg-white rounded-lg border border-gray-200 p-8 md:p-12">
                <div className="max-w-2xl mx-auto text-center">
                  <div className="mx-auto bg-[#052844]/5 rounded-full p-4 w-20 h-20 flex items-center justify-center mb-6">
                    <SearchIcon className="h-10 w-10 text-[#052844]" />
                  </div>
                  <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-3">Find Available Cameras</h3>
                  <p className="text-sm lg:text-base text-gray-600 mb-8 max-w-md mx-auto">
                    Select your rental dates to see which cameras are available for your desired period.
                  </p>
                  
                  <div className="bg-[#052844]/5 border border-[#052844]/10 rounded-lg p-5 text-left max-w-lg mx-auto">
                    <h4 className="text-sm font-semibold text-[#052844] mb-3 flex items-center">
                      <Info className="mr-2 h-4 w-4" />
                      Search Tips
                    </h4>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <div className="flex-shrink-0 h-5 w-5 text-[#052844] mt-0.5">•</div>
                        <p className="text-sm text-gray-700 ml-2">Choose your exact rental dates for accurate availability</p>
                      </li>
                      <li className="flex items-start">
                        <div className="flex-shrink-0 h-5 w-5 text-[#052844] mt-0.5">•</div>
                        <p className="text-sm text-gray-700 ml-2">See real-time availability and pricing</p>
                      </li>
                      <li className="flex items-start">
                        <div className="flex-shrink-0 h-5 w-5 text-[#052844] mt-0.5">•</div>
                        <p className="text-sm text-gray-700 ml-2">Book instantly with your selected dates</p>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              /* Search Results Display */
              <div className="space-y-5">
                {/* Results header */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h2 className="text-base lg:text-lg font-semibold text-gray-900">
                      Search Results <span className="text-[#052844]">({searchResults.length})</span>
                    </h2>
                    <div className="flex items-center text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">
                      <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>
                        {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Loading state */}
                {filterLoading ? (
                  <>
                    {/* Desktop and Tablet Skeleton */}
                    <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-2 gap-5 lg:gap-6">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                          {/* Image skeleton */}
                          <div className="w-full h-48 bg-gray-200 rounded-lg mb-4"></div>
                          {/* Title skeleton */}
                          <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                          {/* Description skeleton */}
                          <div className="space-y-2 mb-4">
                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                          </div>
                          {/* Price skeleton */}
                          <div className="flex justify-between items-center">
                            <div className="h-5 bg-gray-200 rounded w-24"></div>
                            <div className="h-10 bg-gray-200 rounded w-28"></div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mobile Skeleton */}
                    <div className="grid grid-cols-2 gap-4 md:hidden">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 animate-pulse">
                          {/* Image skeleton */}
                          <div className="w-full h-32 bg-gray-200 rounded-lg mb-2"></div>
                          {/* Title skeleton */}
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          {/* Price skeleton */}
                          <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                          {/* Button skeleton */}
                          <div className="h-8 bg-gray-200 rounded w-full"></div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : searchResults.length > 0 ? (
                  /* Camera Grid - Responsive */
                  <>
                    {/* Desktop and Tablet */}
                    <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-2 gap-5 lg:gap-6">
                      {searchResults.map((camera) => (
                        <CameraCardBig
                          key={camera.id}
                          camera={camera}
                          onRentClick={handleRentClick}
                          onFavoriteClick={handleFavoriteClick}
                          isFavorite={favorites.has(camera.id)}
                          startDate={startDate}
                          endDate={endDate}
                        />
                      ))}
                    </div>

                    {/* Mobile */}
                    <div className="grid grid-cols-2 gap-4 md:hidden">
                      {searchResults.map((camera) => (
                        <CameraCard
                          key={camera.id}
                          camera={camera}
                          onRentClick={handleRentClick}
                          onFavoriteClick={handleFavoriteClick}
                          isFavorite={favorites.has(camera.id)}
                          startDate={startDate}
                          endDate={endDate}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  /* No Results State */
                  <div className="bg-white rounded-lg border border-gray-200 p-8 md:p-12">
                    <div className="max-w-md mx-auto text-center">
                      <div className="mx-auto bg-gray-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mb-5">
                        <SearchIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2">No cameras available</h3>
                      <p className="text-sm lg:text-base text-gray-600 mb-6">
                        No camera models are available for the selected dates.
                      </p>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Try:</p>
                          <div className="flex flex-wrap justify-center gap-2">
                            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">Different dates</span>
                            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">Shorter rental period</span>
                            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">Future dates</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={handleClearFilter}
                          className="mt-2 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-150"
                          disabled={filterLoading}
                        >
                          Try Different Dates
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}