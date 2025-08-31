// src/pages/user/Search.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Filter, Calendar, X } from 'lucide-react';
import CameraCard from '../../components/CameraCard';
import DateFilterInput from '../../components/DateFilterInput';
import useCameraStore from '../../stores/cameraStore';
import { getAvailableCamerasForDates } from '../../services/cameraService';

export default function Search() {
  const navigate = useNavigate();
  // === STORE STATE AND ACTIONS ===
  const {
    // Camera data
    cameras,
    displayedCameras,
    loading,
    error,
    filterLoading,
    // Date filter state
    startDate,
    endDate,
    isFilterActive,
    // Actions
    setCameras,
    setDisplayedCameras,
    setLoading,
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

  // Clear date filters when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      // This cleanup function runs when the component unmounts
      resetBrowseFilter();
    };
  }, [resetBrowseFilter]);

  // === EVENT HANDLERS ===
  const handleDateChange = (e, type) => {
    handleBrowseDateChange(e, type);
  };

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

    setError(''); // Clear previous errors
    setFilterLoading(true);
    
    try {
      const { data: availableCameras, error: fetchError } = await getAvailableCamerasForDates(startDate, endDate);
      if (fetchError) {
        throw new Error(fetchError);
      }
      setSearchResults(availableCameras || []);
      setDisplayedCameras(availableCameras || []);
      setIsFilterActive(true);
    } catch (err) {
      console.error('Error checking camera availability:', err);
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
    // Reset rental flow state and set the selected camera model
    resetRentalFlowState();
    setRentalFlowCameraModelName(cameraModel.name);
    setRentalFlowCamera(cameraModel);
    
    // Navigate to rental page with camera data and pre-selected dates
    navigate('/user/rental', {
      state: {
        camera: cameraModel,
        sourcePageType: "search",
        preSelectedDates: { startDate, endDate }
      }
    });
  };

  const handleBackToBrowse = () => {
    resetRentalFlowState();
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
    <div className="min-h-screen lg:max-w-6xl lg:mx-auto lg:px-8">
      {/* === MAIN CONTENT SECTION === */}
      <div className="px-4 py-6">
        {/* === SEARCH INTERFACE SECTION === */}
        <div className="space-y-6">
          {/* === DATE FILTER SECTION === */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 sticky top-0 z-10">
            <div className="p-4 lg:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Filter className="mr-2 h-5 w-5 text-blue-900" />
                Search Available Cameras
              </h2>
              
              <div className="space-y-3">
                <DateFilterInput
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={handleStartDateChange}
                  onEndDateChange={handleEndDateChange}
                  minStartDate={new Date().toISOString().split('T')[0]}
                  disabled={filterLoading}
                  idPrefix="search-filter"
                />
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleApplyFilter}
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
                        <SearchIcon className="mr-2 h-4 w-4" />
                        Search Cameras
                      </>
                    )}
                  </button>
                  {isFilterActive && (
                    <button
                      onClick={handleClearFilter}
                      className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
                      title="Clear Search"
                      disabled={filterLoading}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-600 flex items-center">
                      <X className="mr-2 h-4 w-4 flex-shrink-0" />
                      {error}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* === SEARCH RESULTS SECTION === */}
          {!isFilterActive ? (
            /* === EMPTY SEARCH STATE === */
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <div className="max-w-md mx-auto">
                <SearchIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Search for Available Cameras</h3>
                <p className="text-gray-500 mb-6">
                  Select your rental dates above to find cameras available for your desired period.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Search Tips:</h4>
                  <ul className="text-xs text-blue-800 space-y-1 text-left">
                    <li>• Choose your exact rental dates</li>
                    <li>• See real-time availability and pricing</li>
                    <li>• Compare different camera models</li>
                    <li>• Book instantly with selected dates</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            /* === SEARCH RESULTS DISPLAY === */
            <div className="space-y-4">
              {/* Results header */}
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  Search Results ({searchResults.length} cameras found)
                </h2>
                <p className="text-gray-600 text-xs flex items-center">
                  <Calendar className="mr-1 h-3.5 w-3.5" />
                  {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                </p>
              </div>

              {/* Loading state */}
              {filterLoading ? (
                <div className="flex justify-center items-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : searchResults.length > 0 ? (
                /* === CAMERA GRID === */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
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
              ) : (
                /* === NO RESULTS STATE === */
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <SearchIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-base font-medium text-gray-900 mb-2">No cameras available</h3>
                  <p className="text-gray-500 text-sm mb-4">
                    No camera models are available for the selected dates.
                  </p>
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400">Try:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">Different dates</span>
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">Shorter rental period</span>
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">Future dates</span>
                    </div>
                  </div>
                  <button
                    onClick={handleClearFilter}
                    className="mt-4 inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    disabled={filterLoading}
                  >
                    Try Different Dates
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}