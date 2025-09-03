import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

const CameraDetails = ({ camera, isMobile = false }) => {
  const [activeTab, setActiveTab] = useState("description");
  const [inclusions, setInclusions] = useState([]);
  const [loadingInclusions, setLoadingInclusions] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const contentRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Fetch inclusions when camera changes
  useEffect(() => {
    if (!camera?.id) return;

    const fetchInclusions = async () => {
      setLoadingInclusions(true);
      const { data, error } = await supabase
        .from("camera_inclusions")
        .select("quantity, inclusion_items:inclusion_items(name)")
        .eq("camera_id", camera.id);

      if (error) {
        setInclusions([]);
      } else {
        setInclusions(data || []);
      }

      setLoadingInclusions(false);
    };

    fetchInclusions();
  }, [camera?.id]);

  // Handle touch events for swipe
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (!touchStartX.current || !touchStartY.current) return;
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = Math.abs(touchStartX.current - touchX);
    const deltaY = Math.abs(touchStartY.current - touchY);
    
    // Only prevent scrolling if horizontal swipe is detected
    if (deltaX > deltaY && deltaX > 10) {
      e.stopPropagation();
    }
  };

  const handleTouchEnd = (e) => {
    if (!touchStartX.current) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchStartX.current - touchEndX;
    const deltaY = Math.abs(touchStartY.current - touchEndY);
    
    const isLeftSwipe = deltaX > 40 && deltaY < 25;
    const isRightSwipe = deltaX < -40 && deltaY < 25;

    if (isLeftSwipe && activeTab === "description" && !isAnimating) {
      setIsAnimating(true);
      setTimeout(() => {
        setActiveTab("inclusions");
        setIsAnimating(false);
      }, 150);
    } else if (isRightSwipe && activeTab === "inclusions" && !isAnimating) {
      setIsAnimating(true);
      setTimeout(() => {
        setActiveTab("description");
        setIsAnimating(false);
      }, 150);
    }
  };

  if (isMobile) {
    return (
      <div className="mb-5">
        {/* Tabs (Description & Inclusions) */}
        <div className="flex border-b border-gray-200 mb-3">
          <button
            onClick={() => {
              if (!isAnimating) {
                setIsAnimating(true);
                setTimeout(() => {
                  setActiveTab("description");
                  setIsAnimating(false);
                }, 150);
              }
            }}
            className={`flex-1 py-2 text-center text-sm font-medium transition-colors duration-200 ${
              activeTab === "description"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            aria-selected={activeTab === "description"}
          >
            Description
          </button>
          <button
            onClick={() => {
              if (!isAnimating) {
                setIsAnimating(true);
                setTimeout(() => {
                  setActiveTab("inclusions");
                  setIsAnimating(false);
                }, 150);
              }
            }}
            className={`flex-1 py-2 text-center text-sm font-medium transition-colors duration-200 ${
              activeTab === "inclusions"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            aria-selected={activeTab === "inclusions"}
          >
            Inclusions
          </button>
        </div>

        {/* Swipeable Content Area */}
        <div className="relative overflow-hidden">
          <div 
            ref={contentRef}
            className={`transition-all duration-200 ease-in-out ${
              isAnimating 
                ? (activeTab === "description" ? "transform translate-x-[-20px] opacity-0" : "transform translate-x-[20px] opacity-0")
                : "transform translate-x-0 opacity-100"
            }`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Description Tab */}
            {activeTab === "description" && (
              <div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {camera?.description || (
                    <span className="text-gray-400">No description available</span>
                  )}
                </p>
              </div>
            )}

            {/* Inclusions Tab */}
            {activeTab === "inclusions" && (
              <div>
                {loadingInclusions ? (
                  <div className="flex items-center text-gray-500 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading inclusions...
                  </div>
                ) : inclusions.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                    {inclusions.map((inclusion, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                        <span className="text-gray-700 text-sm">
                          {inclusion.inclusion_items?.name}
                          {inclusion.quantity > 1 ? ` (x${inclusion.quantity})` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No specific inclusions listed</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop version - just inclusions
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Inclusions</h3>
      {loadingInclusions ? (
        <div className="flex items-center text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Loading inclusions...
        </div>
      ) : inclusions.length > 0 ? (
        <div className="space-y-2">
          {inclusions.map((inclusion, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
              <span className="text-gray-700">
                {inclusion.inclusion_items?.name}
                {inclusion.quantity > 1 ? ` (x${inclusion.quantity})` : ""}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No specific inclusions listed</p>
      )}
    </div>
  );
};

export default CameraDetails;