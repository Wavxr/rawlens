import { useState, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';

/**
 * FilterTabs Component - Swipeable filter tabs for mobile, pill-style for desktop
 * @param {Object} props
 * @param {Array} props.filters - Array of filter objects [{ key, label, shortLabel, icon, count }]
 * @param {string} props.activeFilter - Currently active filter key
 * @param {Function} props.onFilterChange - Callback when filter changes
 * @param {boolean} props.isMobile - Whether to use mobile layout
 * @param {React.ReactNode} props.children - Content to wrap with swipe detection (mobile only)
 */
const FilterTabs = ({ filters, activeFilter, onFilterChange, isMobile = false, children }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const contentRef = useRef(null);

  // Get current filter index
  const currentIndex = filters.findIndex(f => f.key === activeFilter);

  // Swipe handlers for mobile using react-swipeable
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (!isAnimating && currentIndex < filters.length - 1) {
        setIsAnimating(true);
        setTimeout(() => {
          onFilterChange(filters[currentIndex + 1].key);
          setIsAnimating(false);
        }, 150);
      }
    },
    onSwipedRight: () => {
      if (!isAnimating && currentIndex > 0) {
        setIsAnimating(true);
        setTimeout(() => {
          onFilterChange(filters[currentIndex - 1].key);
          setIsAnimating(false);
        }, 150);
      }
    },
    preventScrollOnSwipe: true,
    trackMouse: false,
    trackTouch: true,
    delta: 50,
  });

  if (isMobile) {
    return (
      <div className="mb-4 sm:mb-5">
        {/* Mobile Pill Container */}
        <div className="flex rounded-2xl border-2 border-neutral-200 bg-white p-1 shadow-sm">
          {filters.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => {
                  if (!isAnimating) {
                    setIsAnimating(true);
                    setTimeout(() => {
                      onFilterChange(filter.key);
                      setIsAnimating(false);
                    }, 150);
                  }
                }}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 whitespace-nowrap flex-1 active:scale-95 ${
                  isActive
                    ? 'bg-[#052844] text-white shadow-md scale-105'
                    : 'text-neutral-600 hover:bg-neutral-50 active:bg-neutral-100'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />}
                <span className="tracking-tight">{filter.shortLabel || filter.label}</span>
                {filter.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {filter.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Swipe Indicator Dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {filters.map((filter, index) => (
            <div
              key={filter.key}
              className={`rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-6 h-1.5 bg-[#052844]'
                  : 'w-1.5 h-1.5 bg-neutral-300'
              }`}
            />
          ))}
        </div>

        {/* Swipeable Content Area Wrapper */}
        <div
          {...swipeHandlers}
          ref={contentRef}
          className={`transition-opacity duration-200 ${
            isAnimating ? 'opacity-70' : 'opacity-100'
          }`}
        >
          {children}
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="mb-6">
      <div className="flex rounded-lg border border-gray-200 bg-white p-1 overflow-x-auto">
        {filters.map((filter) => {
          const Icon = filter.icon;
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => onFilterChange(filter.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-150 whitespace-nowrap ${
                activeFilter === filter.key
                  ? 'bg-[#052844] text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span>{filter.label}</span>
              {filter.count !== undefined && (
                <span
                  className={`ml-1 px-2 py-0.5 rounded-md text-xs font-bold ${
                    activeFilter === filter.key
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {filter.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterTabs;
