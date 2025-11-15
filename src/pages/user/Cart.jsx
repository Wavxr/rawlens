import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import useAuthStore from '../../stores/useAuthStore';
import useRentalStore from '../../stores/rentalStore';
import { 
  subscribeToUserRentals, 
  subscribeToUserPayments, 
  unsubscribeFromChannel 
} from '../../services/realtimeService';
import { Loader2, Camera as CameraIcon, AlertCircle, Clock, CheckCircle2, XCircle, CreditCard } from 'lucide-react';
import FilterTabs from '../../components/rental/shared/FilterTabs';
import RequestCard from '../../components/rental/shared/RequestCard';
import RequestDetailView from '../../components/rental/shared/RequestDetailView';
import MobileRequestOverlay from '../../components/rental/layouts/MobileRequestOverlay';
import useIsMobile from '../../hooks/useIsMobile';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


/**
 * EmptyState Component - Shows when no rentals in filter
 */
const EmptyState = ({ activeFilter }) => {
  const config = {
    to_approve: {
      icon: Clock,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-100',
      title: 'No pending requests',
      subtitle: 'Once you submit a rental request, it will appear here while awaiting admin review.'
    },
    to_pay: {
      icon: CreditCard,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-100',
      title: 'No payment required',
      subtitle: 'Confirmed rentals requiring payment will appear here. Check other tabs for your rentals.'
    },
    declined: {
      icon: XCircle,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-100',
      title: 'No declined requests',
      subtitle: 'If a rental request is declined by an admin, it will appear here with the rejection reason.'
    }
  };

  const currentConfig = config[activeFilter] || config.to_approve;
  const Icon = currentConfig.icon;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-8 sm:p-12 text-center">
      <div className={`w-16 h-16 rounded-2xl ${currentConfig.bgColor} flex items-center justify-center mx-auto mb-4`}>
        <Icon className={`h-8 w-8 ${currentConfig.iconColor}`} />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{currentConfig.title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">{currentConfig.subtitle}</p>
    </div>
  );
};

/**
 * Main Requests Component
 */
const Requests = () => {
  const { user, loading: authLoading } = useAuthStore();
  const { rentals, loading, error, loadRentals } = useRentalStore();
  const rentalSubscriptionRef = useRef(null);
  const paymentSubscriptionRef = useRef(null);
  const isMobile = useIsMobile();

  // State
  const [activeFilter, setActiveFilter] = useState('to_approve');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const selectedRequestRef = useRef(null);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    if (user?.id) {
      loadRentals(user.id);
    }
  }, [user?.id, loadRentals]);

  // Real-time subscriptions
  useEffect(() => {
    if (user?.id) {
      loadRentals(user.id);

      // Subscribe to user rentals
      if (!rentalSubscriptionRef.current) {
        rentalSubscriptionRef.current = subscribeToUserRentals(user.id);
      }

      // Subscribe to user payments
      if (!paymentSubscriptionRef.current) {
        paymentSubscriptionRef.current = subscribeToUserPayments(user.id, (payload) => {
          console.log('Payment update received in Cart:', payload);

          const currentSelected = selectedRequestRef.current;
          if (payload?.hydratedData?.rental_id && currentSelected?.id === payload.hydratedData.rental_id) {
            const freshRental = useRentalStore.getState().rentals.find(
              (rental) => rental.id === payload.hydratedData.rental_id
            );

            if (freshRental && freshRental !== currentSelected) {
              setSelectedRequest(freshRental);
            }
          }
        });
      }
    }

    return () => {
      // Clean up subscriptions
      if (rentalSubscriptionRef.current) {
        unsubscribeFromChannel(rentalSubscriptionRef.current);
        rentalSubscriptionRef.current = null;
      }
      if (paymentSubscriptionRef.current) {
        unsubscribeFromChannel(paymentSubscriptionRef.current);
        paymentSubscriptionRef.current = null;
      }
    };
  }, [user?.id, loadRentals]);

  useEffect(() => {
    selectedRequestRef.current = selectedRequest;
  }, [selectedRequest]);

  // Filter rentals into groups
  const filterGroups = useMemo(() => {
    const groups = { to_approve: [], to_pay: [], declined: [] };
    
    for (const r of rentals) {
      if (r.rental_status === 'pending') {
        groups.to_approve.push(r);
      } else if (r.rental_status === 'rejected') {
        groups.declined.push(r);
      } else if (r.rental_status === 'confirmed') {
        // Check if payment is needed
        const initialPayment = r.payments?.find(
          p => p.payment_type === 'rental' && !p.extension_id
        );
        const paymentStatus = initialPayment?.payment_status;
        
        // Add to "To Pay" if payment is not verified
        if (!initialPayment || ['pending', 'submitted', 'rejected'].includes(paymentStatus)) {
          groups.to_pay.push(r);
        }
      }
    }

    // Sort "To Pay" - pending/rejected payment first
    groups.to_pay.sort((a, b) => {
      const aPayment = a.payments?.find(p => p.payment_type === 'rental' && !p.extension_id);
      const bPayment = b.payments?.find(p => p.payment_type === 'rental' && !p.extension_id);
      const aStatus = aPayment?.payment_status;
      const bStatus = bPayment?.payment_status;
      
      // Pending/rejected come first
      if (aStatus === 'pending' || aStatus === 'rejected') return -1;
      if (bStatus === 'pending' || bStatus === 'rejected') return 1;
      
      // Then by start date
      return new Date(a.start_date) - new Date(b.start_date);
    });

    return groups;
  }, [rentals]);

  // Get displayed rentals based on active filter
  const displayedRentals = useMemo(() => filterGroups[activeFilter] || [], [filterGroups, activeFilter]);

  // Auto-select when the displayed collection changes and keep selected request synced with latest store data
  useEffect(() => {
    if (displayedRentals.length === 0) {
      if (selectedRequest) {
        setSelectedRequest(null);
      }
      return;
    }

    const matched = selectedRequest
      ? displayedRentals.find((rental) => rental.id === selectedRequest.id)
      : null;

    const nextSelection = matched || displayedRentals[0];

    if (!selectedRequest || nextSelection !== selectedRequest) {
      setSelectedRequest(nextSelection);
    }
  }, [displayedRentals, selectedRequest]);

  // Ensure selection reference is refreshed whenever rentals update via realtime events
  useEffect(() => {
    if (!selectedRequest) return;

    const latest = rentals.find((rental) => rental.id === selectedRequest.id);
    if (latest && latest !== selectedRequest) {
      setSelectedRequest(latest);
    }
  }, [rentals, selectedRequest]);

  // Handle request card click
  const handleRequestClick = useCallback((rental) => {
    setSelectedRequest(rental);
    if (isMobile) {
      setIsMobileDetailOpen(true);
    }
  }, [isMobile]);

  // Handle mobile overlay close
  const handleMobileClose = useCallback(() => {
    setIsMobileDetailOpen(false);
  }, []);

  // Filter configuration
  const filters = useMemo(() => [
    {
      key: 'to_approve',
      label: 'To Approve',
      shortLabel: 'To Approve',
      // icon: Clock,
      count: filterGroups.to_approve.length
    },
    {
      key: 'to_pay',
      label: 'To Pay',  
      shortLabel: 'To Pay',
      // icon: CreditCard,
      count: filterGroups.to_pay.length
    },
    {
      key: 'declined',
      label: 'Declined',
      shortLabel: 'Declined',
      // icon: XCircle,
      count: filterGroups.declined.length
    }
  ], [filterGroups]);


  // Loading states
  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center mb-4">
            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-neutral-600 animate-spin" />
          </div>
          <p className="text-sm sm:text-base text-neutral-600 font-medium">Checking your session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center mb-4 sm:mb-6 mx-auto">
            <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-neutral-400" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-neutral-800 mb-2 sm:mb-3">Authentication Required</h2>
          <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
            Please log in to view your rental requests and track their status.
          </p>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="bg-neutral-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
        
        {/* Error State */}
        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-2 sm:gap-3">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm sm:text-base text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-16 sm:py-24">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center mb-4 mx-auto">
                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-neutral-600 animate-spin" />
              </div>
              <p className="text-sm sm:text-base text-neutral-600 font-medium">Loading your requests...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Filter Tabs - wrap mobile content for swipe detection */}
            <FilterTabs
              filters={filters}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              isMobile={isMobile}
            >
              {/* Mobile swipeable content */}
              {isMobile && displayedRentals.length > 0 && (
                <div className="space-y-3 mt-4">
                  {displayedRentals.map((rental) => (
                    <RequestCard
                      key={rental.id}
                      rental={rental}
                      variant="mobile"
                      onClick={() => handleRequestClick(rental)}
                    />
                  ))}
                </div>
              )}
            </FilterTabs>

            {displayedRentals.length === 0 ? (
              /* Empty State */
              <EmptyState activeFilter={activeFilter} />
            ) : isMobile ? (
              /* Mobile Overlay */
              <MobileRequestOverlay
                isOpen={isMobileDetailOpen}
                onClose={handleMobileClose}
                title={selectedRequest?.cameras?.name || 'Request Details'}
              >
                <RequestDetailView
                  rental={selectedRequest}
                  onRefresh={handleRefresh}
                  onBack={handleMobileClose}
                  isMobile={true}
                />
              </MobileRequestOverlay>
            ) : (
              /* Desktop Layout */
              <>
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 lg:gap-6">
                  {/* Sidebar - Request Cards */}
                  <div className="xl:col-span-1">
                    <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">
                      Your Requests
                    </h3>
                    <div className="space-y-2 sm:space-y-3 max-h-[400px] xl:max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      {displayedRentals.map((rental) => (
                        <RequestCard
                          key={rental.id}
                          rental={rental}
                          variant="sidebar"
                          isSelected={selectedRequest?.id === rental.id}
                          onClick={() => handleRequestClick(rental)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Detail Panel */}
                  <div className="xl:col-span-3">
                    <RequestDetailView
                      rental={selectedRequest}
                      onRefresh={handleRefresh}
                      isMobile={false}
                    />
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Toast Container */}
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable={false}
          pauseOnHover
          theme="light"
        />
      </div>
    </div>
  );
};

export default Requests;