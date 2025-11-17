import { useState, useEffect, useRef } from "react"
import { Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { supabase } from "@lib/supabaseClient"

const CameraDetails = ({ camera, isMobile = false, calculatedPrice = null }) => {
  const [activeTab, setActiveTab] = useState("description")
  const [inclusions, setInclusions] = useState([])
  const [loadingInclusions, setLoadingInclusions] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const contentRef = useRef(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  // Collapse inclusions when calculatedPrice appears (desktop only)
  useEffect(() => {
    if (calculatedPrice && !isMobile) {
      setIsExpanded(false)
    }
  }, [calculatedPrice, isMobile])

  // Fetch inclusions when camera changes
  useEffect(() => {
    if (!camera?.id) return

    const fetchInclusions = async () => {
      setLoadingInclusions(true)
      const { data, error } = await supabase
        .from("camera_inclusions")
        .select("quantity, inclusion_items:inclusion_items(name)")
        .eq("camera_id", camera.id)

      if (error) {
        setInclusions([])
      } else {
        setInclusions(data || [])
      }

      setLoadingInclusions(false)
    }

    fetchInclusions()
  }, [camera?.id])

  // Handle touch events for swipe
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e) => {
    if (!touchStartX.current || !touchStartY.current) return

    const touchX = e.touches[0].clientX
    const touchY = e.touches[0].clientY
    const deltaX = Math.abs(touchStartX.current - touchX)
    const deltaY = Math.abs(touchStartY.current - touchY)

    // Only prevent scrolling if horizontal swipe is detected
    if (deltaX > deltaY && deltaX > 10) {
      e.stopPropagation()
    }
  }

  const handleTouchEnd = (e) => {
    if (!touchStartX.current) return

    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const deltaX = touchStartX.current - touchEndX
    const deltaY = Math.abs(touchStartY.current - touchEndY)

    const isLeftSwipe = deltaX > 40 && deltaY < 25
    const isRightSwipe = deltaX < -40 && deltaY < 25

    if (isLeftSwipe && activeTab === "description" && !isAnimating) {
      setIsAnimating(true)
      setTimeout(() => {
        setActiveTab("description")
        setIsAnimating(false)
      }, 150)
    } else if (isRightSwipe && activeTab === "inclusions" && !isAnimating) {
      setIsAnimating(true)
      setTimeout(() => {
        setActiveTab("inclusions")
        setIsAnimating(false)
      }, 150)
    }
  }

  if (isMobile) {
    return (
      <div className="mb-6">
        {/* Modern Pill Tab Switcher */}
        <div className="flex gap-2 mb-5 bg-neutral-100 p-1.5 rounded-2xl">
          <button
            onClick={() => {
              if (!isAnimating) {
                setIsAnimating(true)
                setTimeout(() => {
                  setActiveTab("description")
                  setIsAnimating(false)
                }, 150)
              }
            }}
            className={`flex-1 py-2.5 text-center text-sm font-semibold rounded-xl transition-all duration-300 ${
              activeTab === "description"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
            aria-selected={activeTab === "description"}
          >
            Description
          </button>
          <button
            onClick={() => {
              if (!isAnimating) {
                setIsAnimating(true)
                setTimeout(() => {
                  setActiveTab("inclusions")
                  setIsAnimating(false)
                }, 150)
              }
            }}
            className={`flex-1 py-2.5 text-center text-sm font-semibold rounded-xl transition-all duration-300 ${
              activeTab === "inclusions"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
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
                ? activeTab === "description"
                  ? "transform translate-x-[-20px] opacity-0"
                  : "transform translate-x-[20px] opacity-0"
                : "transform translate-x-0 opacity-100"
            }`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Description Tab */}
            {activeTab === "description" && (
              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200">
                <p className="text-neutral-700 text-sm leading-relaxed">
                  {camera?.description || (
                    <span className="text-neutral-400 italic">No description available</span>
                  )}
                </p>
              </div>
            )}

            {/* Inclusions Tab */}
            {activeTab === "inclusions" && (
              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200">
                {loadingInclusions ? (
                  <div className="flex items-center justify-center py-8 text-neutral-500 text-sm">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Loading inclusions...
                  </div>
                ) : inclusions.length > 0 ? (
                  <div className="space-y-3">
                    {inclusions.map((inclusion, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-neutral-800 text-sm leading-relaxed">
                          {inclusion.inclusion_items?.name}
                          {inclusion.quantity > 1 && (
                            <span className="text-neutral-500 ml-1">×{inclusion.quantity}</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-500 text-sm text-center py-4 italic">
                    No specific inclusions listed
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop version - collapsible inclusions
  return (
    <div className="mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 hover:text-blue-600 transition-colors duration-150"
      >
        <span>What's Included</span>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {isExpanded && (
        <div className="transition-all duration-200">
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
  );
};

export default CameraDetails;