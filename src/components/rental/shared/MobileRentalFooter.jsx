import React, { useState, useEffect } from 'react';
import { Loader2, Calendar } from 'lucide-react';
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
  onCheckAvailabilityWithDates, // New prop to pass dates directly
  onRentNow,
  sourcePageType = "home",
  preSelectedDates = null
}) => {
  const [footerState, setFooterState] = useState('initial');
  const [isDateSelectorOpen, setIsDateSelectorOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);

  // Initialize footer state - only run once on mount or when key props change
  useEffect(() => {
    console.log('🚀 MobileRentalFooter: Initializing state...', { sourcePageType, footerState, startDate, endDate, isAvailabilityChecked, isAvailable });
    
    if (sourcePageType === 'search' && preSelectedDates) {
      // For search page, check if availability is already being checked or completed
      if (isCheckingAvailability) {
        setFooterState('checking');
      } else if (isAvailabilityChecked && isAvailable) {
        setFooterState('available');
      } else if (isAvailabilityChecked && !isAvailable) {
        setFooterState('unavailable');
      } else {
        setFooterState('checking'); // Start checking immediately for search
      }
    } else if (sourcePageType === 'home') {
      // Only initialize if we're in initial state and don't have active states
      if (footerState === 'initial') {
        if (startDate && endDate && isAvailabilityChecked && isAvailable) {
          setFooterState('available');
        }
        // Otherwise stay in initial state
      }
      // Don't reset other states (checking, available, unavailable, selectingDates)
    }
  }, [sourcePageType, preSelectedDates]); // Remove most dependencies to prevent constant re-initialization

  // Update footer state based on availability results
  useEffect(() => {
    console.log('🔄 MobileRentalFooter: Availability result effect triggered', { 
      footerState, 
      isCheckingAvailability, 
      isAvailabilityChecked, 
      isAvailable 
    });
    
    // Handle transitions from checking state
    if (footerState === 'checking' && !isCheckingAvailability) {
      if (isAvailabilityChecked && isAvailable) {
        console.log('🟢 MobileRentalFooter: Setting state to available from checking');
        setFooterState('available');
      } else if (isAvailabilityChecked && !isAvailable) {
        console.log('🔴 MobileRentalFooter: Setting state to unavailable from checking');
        setFooterState('unavailable');
      }
    }
    
    // Handle new availability results when we're in unavailable state (after "Check another date")
    if (footerState === 'unavailable' && !isCheckingAvailability && isAvailabilityChecked) {
      if (isAvailable) {
        console.log('🟢 MobileRentalFooter: Setting state to available from unavailable');
        setFooterState('available');
      }
      // If still unavailable, stay in unavailable state
    }
  }, [isCheckingAvailability, isAvailabilityChecked, isAvailable, footerState]);

  const handleFooterButtonClick = async () => {
    if (sourcePageType === 'search') {
      // For search page, the availability check is automatic
      // If available, proceed to rent
      if (footerState === 'available') {
        onRentNow();
      }
      // For other states (checking, unavailable), button should be disabled
      return;
    }

    // Home page logic
    if (footerState === 'initial') {
      // For home page, show date selector
      setTempStartDate(startDate);
      setTempEndDate(endDate);
      setIsDateSelectorOpen(true);
      setFooterState('selectingDates');
    } else if (footerState === 'selectingDates') {
      // Check dates and validate
      if (!tempStartDate || !tempEndDate) {
        return;
      }
      
      // Update store with selected dates
      onDateChange(tempStartDate, tempEndDate);
      
      // Close date selector and immediately check availability
      setIsDateSelectorOpen(false);
      console.log('📅 MobileRentalFooter: Setting state to checking');
      setFooterState('checking');
      
      // Check availability with the temp dates directly to avoid timing issues
      setTimeout(async () => {
        if (onCheckAvailabilityWithDates) {
          await onCheckAvailabilityWithDates(tempStartDate, tempEndDate);
        } else {
          await onCheckAvailability();
        }
      }, 100);
    } else if (footerState === 'available') {
      // Proceed to rent
      onRentNow();
    } else if (footerState === 'unavailable') {
      // For home page, allow user to check another date
      if (sourcePageType === 'home') {
        console.log('🔄 MobileRentalFooter: User clicked "Check another date"');
        setTempStartDate(startDate);
        setTempEndDate(endDate);
        setIsDateSelectorOpen(true);
        setFooterState('selectingDates');
      }
    } else if (footerState === 'checking') {
      // Do nothing while checking - prevent any accidental state changes
      return;
    }
  };

  const getButtonText = () => {
    console.log(`🎯 MobileRentalFooter: Current state is "${footerState}" for "${sourcePageType}" page`);
    
    if (sourcePageType === 'search') {
      // For search page
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

    // For home page
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
      // Search page styling
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

    // Home page styling
    switch (footerState) {
      case 'unavailable':
        return 'bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg'; // Clickable for "Check another date"
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
      // For search page, only disable when checking, unavailable, or processing
      return footerState === 'checking' || 
             footerState === 'unavailable' || 
             isSubmitting || 
             isGeneratingContract;
    }

    // For home page - "unavailable" state is clickable to allow "Check another date"
    return footerState === 'checking' || 
           (footerState === 'selectingDates' && (!tempStartDate || !tempEndDate)) ||
           isSubmitting || 
           isGeneratingContract;
  };

  return (
    <div className='bg-white'>
      <div className="lg:hidden sticky inset-x-0 bottom-1 mb-1 mx-2 bg-white/95 backdrop-blur-xl border border-gray-200/70 rounded-2xl shadow-lg shadow-gray-400/10 z-40 transition-all duration-300 ease-in-out">
        {/* Date Selector Section - Expandable */}
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

        {/* Main Action Section */}
        <div className="flex items-center justify-between p-4">
          {/* Price Display */}
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Total Price</div>
            <div className="text-base font-bold text-gray-900 truncate">
              {calculatedPrice?.total !== undefined ? `₱${calculatedPrice.total.toFixed(2)}` : 'Check availability'}
            </div>
          </div>

          {/* Single Action Button */}
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
