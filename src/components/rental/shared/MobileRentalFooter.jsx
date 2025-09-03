import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import DateFilterInput from '../../forms/DateFilterInput';

const MobileRentalFooter = ({
  calculatedPrice,
  isCheckingAvailability,
  isAvailabilityChecked,
  isAvailable,
  isSubmitting,
  isGeneratingContract,
  availabilityError,
  startDate,
  endDate,
  onDateChange,
  onCheckAvailability,
  onCheckAvailabilityWithDates,
  onRentNow,
  sourcePageType = "home",
  preSelectedDates = null
}) => {
  const [footerState, setFooterState] = useState('initial');
  const [isDateSelectorOpen, setIsDateSelectorOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);
  const footerRef = useRef(null);

  // Auto-scroll to footer when content expands
  useEffect(() => {
    const footerElement = footerRef.current;
    if (!footerElement) return;

    const isNearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
    
    if (isNearBottom) {
      setTimeout(() => {
        footerElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }, 100);
    }
  }, [availabilityError, isAvailabilityChecked, isAvailable]);

  // Initialize footer state
  useEffect(() => {
    if (sourcePageType === 'search' && preSelectedDates) {
      if (isCheckingAvailability) {
        setFooterState('checking');
      } else if (isAvailabilityChecked && isAvailable) {
        setFooterState('available');
      } else if (isAvailabilityChecked && !isAvailable) {
        setFooterState('unavailable');
      } else {
        setFooterState('checking');
      }
    } else if (sourcePageType === 'home') {
      if (footerState === 'initial') {
        if (startDate && endDate && isAvailabilityChecked && isAvailable) {
          setFooterState('available');
        }
      }
    }
  }, [sourcePageType, preSelectedDates, startDate, endDate, isAvailabilityChecked, isAvailable]);

  // Update footer state based on availability results
  useEffect(() => {
    if (footerState === 'checking' && !isCheckingAvailability) {
      if (isAvailabilityChecked && isAvailable) {
        setFooterState('available');
      } else if (isAvailabilityChecked && !isAvailable) {
        setFooterState('unavailable');
      }
    }
    
    if (footerState === 'unavailable' && !isCheckingAvailability && isAvailabilityChecked) {
      if (isAvailable) {
        setFooterState('available');
      }
    }
  }, [isCheckingAvailability, isAvailabilityChecked, isAvailable, footerState]);

  const handleFooterButtonClick = async () => {
    if (sourcePageType === 'search') {
      if (footerState === 'available') {
        onRentNow();
      }
      return;
    }

    if (footerState === 'initial') {
      setTempStartDate(startDate);
      setTempEndDate(endDate);
      setIsDateSelectorOpen(true);
      setFooterState('selectingDates');
    } else if (footerState === 'selectingDates') {
      if (!tempStartDate || !tempEndDate) {
        return;
      }
      
      onDateChange(tempStartDate, tempEndDate);
      setIsDateSelectorOpen(false);
      setFooterState('checking');
      
      setTimeout(async () => {
        if (onCheckAvailabilityWithDates) {
          await onCheckAvailabilityWithDates(tempStartDate, tempEndDate);
        } else {
          await onCheckAvailability();
        }
      }, 100);
    } else if (footerState === 'available') {
      onRentNow();
    } else if (footerState === 'unavailable') {
      if (sourcePageType === 'home') {
        setTempStartDate(startDate);
        setTempEndDate(endDate);
        setIsDateSelectorOpen(true);
        setFooterState('selectingDates');
      }
    } else if (footerState === 'checking') {
      return;
    }
  };

  const getButtonText = () => {
    if (sourcePageType === 'search') {
      switch (footerState) {
        case 'checking':
          return 'Checking...';
        case 'available':
          if (isGeneratingContract || isSubmitting) {
            return 'Processing...';
          }
          return 'Rent Now';
        case 'unavailable':
          return 'Date Not Available';
        default:
          return 'Check Availability';
      }
    }

    switch (footerState) {
      case 'initial':
        return 'Check';
      case 'selectingDates':
        return 'Check Dates';
      case 'checking':
        return 'Loading';
      case 'available':
        if (isGeneratingContract || isSubmitting) {
          return 'Processing...';
        }
        return 'Rent Now';
      case 'unavailable':
        return 'Check another date';
      default:
        return 'Check';
    }
  };

  const getButtonStyle = () => {
    if (sourcePageType === 'search') {
      switch (footerState) {
        case 'unavailable':
          return 'bg-red-100/80 text-red-500 cursor-not-allowed';
        case 'checking':
          return 'bg-gray-100/80 text-gray-500 cursor-not-allowed';
        case 'available':
          if (isGeneratingContract || isSubmitting) {
            return 'bg-gray-100/80 text-gray-500 cursor-not-allowed';
          }
          return 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg';
        default:
          return 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg';
      }
    }

    switch (footerState) {
      case 'unavailable':
        return 'bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg';
      case 'checking':
        return 'bg-gray-100/80 text-gray-500 cursor-not-allowed';
      case 'available':
        if (isGeneratingContract || isSubmitting) {
          return 'bg-gray-100/80 text-gray-500 cursor-not-allowed';
        }
        return 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg';
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg';
    }
  };

  const isButtonDisabled = () => {
    if (sourcePageType === 'search') {
      return footerState === 'checking' || 
             footerState === 'unavailable' || 
             isSubmitting || 
             isGeneratingContract;
    }

    return footerState === 'checking' || 
           (footerState === 'selectingDates' && (!tempStartDate || !tempEndDate)) ||
           isSubmitting || 
           isGeneratingContract;
  };

  return (
    <div ref={footerRef} className='bg-white sticky bottom-0 z-10'>
      <div className="lg:hidden sticky inset-x-0 bottom-1 mb-1 mx-2 bg-white/95 backdrop-blur-xl border border-gray-200/70 rounded-2xl shadow-lg shadow-gray-400/10 z-40 transition-all duration-300 ease-in-out">
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isDateSelectorOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="p-3 border-b border-gray-100">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Rental Period</h3>
              <DateFilterInput
                startDate={tempStartDate}
                endDate={tempEndDate}
                onStartDateChange={(e) => setTempStartDate(e.target.value)}
                onEndDateChange={(e) => setTempEndDate(e.target.value)}
                minStartDate={new Date().toISOString().split('T')[0]}
                disabled={isCheckingAvailability || isSubmitting || isGeneratingContract}
                label=""
                idPrefix="rental-flow-mobile"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Total Price</div>
            <div className="text-base font-bold text-gray-900 truncate">
              {calculatedPrice?.total !== undefined ? `₱${calculatedPrice.total.toFixed(2)}` : 'Check availability'}
            </div>
          </div>

          <div className="flex-1 flex justify-end ml-2">
            <button
              onClick={handleFooterButtonClick}
              disabled={isButtonDisabled()}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${getButtonStyle()}`}
            >
              {(footerState === 'checking' || (footerState === 'available' && (isGeneratingContract || isSubmitting))) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
              )}
              {getButtonText()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileRentalFooter;