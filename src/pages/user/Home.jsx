// src/pages/user/Home.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Camera } from 'lucide-react';
import CameraCard from '../../components/camera/CameraCard';
import CameraCardBig from '../../components/camera/CameraCardBig';
import useCameraStore from '../../stores/cameraStore';
import { getCameraModels } from '../../services/cameraService';

export default function Home() {
  const navigate = useNavigate();
  
  // === STORE STATE AND ACTIONS ===
  const {
    // Camera data
    cameras,
    loading,
    error,
    // Actions
    setCameras,
    setLoading,
    setError,
    resetRentalFlowState,
    setRentalFlowCameraModelName,
    setRentalFlowCamera,
    resetBrowseFilter,
  } = useCameraStore();

  const [favorites, setFavorites] = useState(new Set());

  // Clear date filters when Home page loads (in case user came from Search)
  useEffect(() => {
    resetBrowseFilter();
  }, [resetBrowseFilter]);

  // === DATA LOADING ===
  useEffect(() => {
    const fetchCameraModels = async () => {
      setLoading(true);
      setError('');
      
      try {
        const { data: modelsData, error: fetchError } = await getCameraModels();
        if (fetchError) {
          throw new Error(fetchError);
        }
        setCameras(modelsData || []);
      } catch (err) {
        console.error('Error fetching camera models:', err);
        setError('Failed to load camera models. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchCameraModels();
  }, [setCameras, setLoading, setError]);

  // === EVENT HANDLERS ===
  const handleRentClick = (cameraModel) => {
    // Reset rental flow state and set the selected camera model
    resetRentalFlowState();
    setRentalFlowCameraModelName(cameraModel.name);
    setRentalFlowCamera(cameraModel);
    
    // Navigate to rental page with camera data
    navigate('/user/rental', {
      state: {
        camera: cameraModel,
        sourcePageType: "home"
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

  // === LOADING STATE ===
  if (loading) {
    return (
      <div className="min-h-screen lg:max-w-6xl lg:mx-auto lg:px-8">
        <div className="px-4 py-4">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center mb-4">
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
            <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          
          {/* Camera Grid Skeleton - Responsive */}
          <>
            {/* Desktop Skeleton */}
            <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-200">
                  <div className="w-full aspect-video bg-gray-200 rounded-lg animate-pulse mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                    <div className="flex flex-wrap gap-1 pt-2">
                      <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                      <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
                      <div className="h-6 bg-gray-200 rounded w-14 animate-pulse"></div>
                    </div>
                    <div className="flex justify-between items-end pt-2">
                      <div className="space-y-1">
                        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                        <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Skeleton */}
            <div className="grid grid-cols-2 gap-4 md:hidden">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm p-3 border border-gray-200">
                  <div className="w-full aspect-square bg-gray-200 rounded-lg animate-pulse mb-3"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                    <div className="h-5 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        </div>
      </div>
    );
  }

  // === ERROR STATE ===
  if (error && !loading) {
    return (
      <div className="min-h-screen lg:max-w-6xl lg:mx-auto lg:px-8">
        <div className="px-4 py-4">
          <div className="text-center py-12">
            <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load cameras</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:max-w-6xl lg:mx-auto lg:px-8">
      {/* === MAIN HEADER SECTION === */}
      <div className="px-4 py-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-lg font-semibold text-gray-900">Hello👋, Camera Explorer</p>
            <p className="text-sm text-gray-600 flex items-center">
              📍 Discover Amazing Cameras
            </p>
          </div>
          <button className="p-2 text-gray-600 hover:text-gray-800 bg-gray-100 rounded-lg transition-colors">
            <Bell size={20} />
          </button>
        </div>
        
        {/* === FEATURED BANNER SECTION === */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-white text-sm font-medium mb-2">Get high quality images with expert lenses</p>
              <button className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                Explore Now
              </button>
            </div>
            <div className="ml-4">
              <Camera className="text-white opacity-20" size={32} />
            </div>
          </div>
        </div>

        {/* === BRAND FILTER SECTION === */}
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Top Brands</h3>
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {['Canon', 'Sony', 'Fujifilm', 'Nikon', 'GoPro'].map((brand) => (
              <button
                key={brand}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                  brand === 'Canon' 
                    ? 'bg-blue-900 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>

        {/* === CATEGORY FILTER SECTION === */}
        <div className="mb-6">
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {['Cameras', 'Lenses', 'Tripods', 'Lighting', 'Accessories'].map((category) => (
              <button
                key={category}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                  category === 'Cameras'
                    ? 'bg-blue-100 text-blue-900 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>
    
      {/* === MAIN CONTENT SECTION === */}
      <div className="px-4 py-6">
        {/* === CAMERA SHOWCASE SECTION === */}
        <div className="space-y-6">
          {/* Results header */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Featured Camera Models ({cameras.length})
            </h2>
          </div>

          {/* Camera grid - Responsive design with different cards */}
          {cameras.length > 0 ? (
            <>
              {/* Desktop and Tablet: Use CameraCardBig */}
              <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-6">
                {cameras.map((camera) => (
                  <CameraCardBig
                    key={camera.id}
                    camera={camera}
                    onRentClick={handleRentClick}
                    onFavoriteClick={handleFavoriteClick}
                    isFavorite={favorites.has(camera.id)}
                  />
                ))}
              </div>

              {/* Mobile: Use regular CameraCard */}
              <div className="grid grid-cols-2 gap-4 md:hidden">
                {cameras.map((camera) => (
                  <CameraCard
                    key={camera.id}
                    camera={camera}
                    onRentClick={handleRentClick}
                    onFavoriteClick={handleFavoriteClick}
                    isFavorite={favorites.has(camera.id)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <Camera className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-3 text-base font-medium text-gray-900">No camera models found</h3>
              <p className="mt-1 text-gray-500 text-sm">
                Please check back later for new arrivals.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
