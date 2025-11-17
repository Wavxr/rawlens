import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import CameraCard from '@components/user/camera/CameraCard';
import CameraCardBig from '@components/user/camera/CameraCardBig';
import useCameraStore from '@stores/cameraStore';
import useAuthStore from '@stores/useAuthStore';
import { getCameraModels } from '@services/cameraService';

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

  const { profile } = useAuthStore();

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
      <div className="min-h-screen lg:max-w-7xl lg:mx-auto lg:px-8">
        <div className="px-4 py-4 lg:px-6 lg:py-6">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center mb-4 lg:mb-6">
            <div className="space-y-2">
              <div className="h-6 lg:h-7 bg-gray-200 rounded w-48 lg:w-56 animate-pulse"></div>
              <div className="h-4 lg:h-5 bg-gray-200 rounded w-32 lg:w-40 animate-pulse"></div>
            </div>
            <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          
          {/* Camera Grid Skeleton - Responsive */}
          <>
            {/* Desktop Skeleton */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                  <div className="w-full aspect-video bg-gray-200 rounded-lg animate-pulse mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-5 lg:h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
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
      <div className="min-h-screen lg:max-w-7xl lg:mx-auto lg:px-8">
        <div className="px-4 py-4 lg:px-6 lg:py-6">
          <div className="text-center py-12">
            <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load cameras</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#052844] hover:bg-[#063a5e] text-white px-4 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:max-w-7xl lg:mx-auto lg:px-8">
      {/* === MAIN HEADER SECTION === */}
      <div className="px-4 py-4 lg:px-6 lg:py-6">
        <div className="flex justify-between items-center mb-4 lg:mb-6">
          <div>
            <p className="text-lg lg:text-xl font-semibold text-gray-900">
              Hello👋, {profile?.first_name || 'Camera Explorer'}
            </p>
            <p className="text-sm lg:text-base text-gray-600 flex items-center">
              📍 Discover Amazing Cameras with Rawlens
            </p>
          </div>
        </div>
        
        {/* === FEATURED BANNER SECTION === */}
        <div className="bg-gradient-to-r from-[#052844] to-[#063a5e] rounded-lg p-5 lg:p-6 mb-6 border border-[#052844]/10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-white text-sm lg:text-base font-medium mb-3">Get high quality images with premium cameras</p>
              <button className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-5 py-2.5 lg:px-6 lg:py-3 rounded-lg text-sm lg:text-base font-semibold transition-colors">
                Explore Now
              </button>
            </div>
            <div className="ml-4">
              <Camera className="text-white opacity-20" size={40} />
            </div>
          </div>
        </div>

      </div>
    
      {/* === MAIN CONTENT SECTION === */}
      <div className="px-4 pb-6 lg:px-6 lg:pb-8">
        {/* === CAMERA SHOWCASE SECTION === */}
        <div className="space-y-6">
          {/* Results header */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg lg:text-xl font-semibold text-gray-900">
              Featured Camera Models ({cameras.length})
            </h2>
          </div>

          {/* Camera grid - Responsive design with different cards */}
          {cameras.length > 0 ? (
            <>
              {/* Desktop and Tablet: Use CameraCardBig */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
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
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
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
