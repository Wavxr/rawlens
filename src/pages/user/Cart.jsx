import React, { useEffect, useMemo, useState, useRef } from 'react';
import useAuthStore from '../../stores/useAuthStore';
import useRentalStore from '../../stores/rentalStore';
import { subscribeToRentalUpdates, unsubscribeFromRentalUpdates } from '../../services/realtimeService';
import { Loader2, Calendar, Camera as CameraIcon, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import PaymentUploadSection from '../../components/payment/PaymentUploadSection';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function isUpcoming(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d >= today;
}

const StatusPill = ({ status }) => {
  const statusConfig = {
    pending: {
      bg: 'bg-gradient-to-r from-amber-50 to-yellow-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: Clock,
      glow: 'shadow-amber-100'
    },
    confirmed: {
      bg: 'bg-gradient-to-r from-emerald-50 to-green-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      icon: CheckCircle2,
      glow: 'shadow-emerald-100'
    },
    rejected: {
      bg: 'bg-gradient-to-r from-red-50 to-rose-50',
      text: 'text-red-800',
      border: 'border-red-200',
      icon: XCircle,
      glow: 'shadow-red-100'
    }
  };

  const config = statusConfig[status] || {
    bg: 'bg-gradient-to-r from-slate-50 to-gray-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: AlertCircle,
    glow: 'shadow-slate-100'
  };

  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 text-xs font-medium border rounded-full ${config.bg} ${config.text} ${config.border} shadow-sm ${config.glow}`}>
      <Icon className="w-2.5 h-2.5 md:w-3 md:h-3" />
      <span className="capitalize text-xs md:text-xs">{status}</span>
    </div>
  );
};

const Section = ({ title, count, children, icon: Icon }) => (
  <div className="bg-gradient-to-br from-white to-gray-50/50 border border-gray-200/60 rounded-2xl overflow-hidden shadow-sm">
    <div className="px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-slate-50 to-gray-50/80 border-b border-gray-200/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-slate-100 to-gray-100 flex items-center justify-center">
            <Icon className="w-3 h-3 md:w-4 md:h-4 text-slate-600" />
          </div>
          <h3 className="text-sm md:text-lg font-medium md:font-semibold text-slate-800">{title}</h3>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <div className="px-2 md:px-3 py-0.5 md:py-1 bg-white/80 border border-slate-200 rounded-full">
            <span className="text-xs md:text-sm font-medium text-slate-600">{count}</span>
          </div>
          <span className="text-xs text-slate-500 hidden md:inline">item{count === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
    <div className="divide-y divide-gray-100">{children}</div>
  </div>
);

const RequestRow = ({ rental, onUploadComplete }) => {
  const camera = rental.cameras || {};
  const dateRange = `${formatDate(rental.start_date)} — ${formatDate(rental.end_date)}`;
  
  return (
    <div className="px-3 md:px-6 py-3 md:py-5 hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-gray-50/30 transition-all duration-200 group">
      <div className="flex items-start gap-3 md:gap-5">
        {/* Camera Image */}
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 md:w-16 md:h-16 rounded-lg md:rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-gray-100 flex items-center justify-center border border-gray-200 group-hover:shadow-md transition-shadow">
            {camera.image_url ? (
              <img
                src={camera.image_url}
                alt={camera.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <CameraIcon className="w-4 h-4 md:w-7 md:h-7 text-slate-400" />
            )}
          </div>
          {/* Status indicator dot */}
          <div className={`absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 w-2 h-2 md:w-3 md:h-3 rounded-full border border-white md:border-2 shadow-sm ${
            rental.rental_status === 'confirmed' ? 'bg-emerald-400' :
            rental.rental_status === 'pending' ? 'bg-amber-400' : 'bg-red-400'
          }`} />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-2 md:space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 md:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                <h4 className="text-sm md:text-base font-medium md:font-semibold text-slate-800 truncate group-hover:text-slate-900 transition-colors">
                  {camera.name || 'Camera'}
                </h4>
                <StatusPill status={rental.rental_status} />
              </div>
              
              {/* Date Range */}
              <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-slate-600">
                <div className="w-4 h-4 md:w-5 md:h-5 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-2.5 h-2.5 md:w-3 md:h-3 text-slate-500" />
                </div>
                <span className="font-medium">{dateRange}</span>
              </div>
            </div>

            {/* Submission Date */}
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-0.5 md:mb-1 hidden md:block">Submitted</div>
              <div className="text-xs md:text-sm font-medium md:font-semibold text-slate-700 bg-slate-100 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md">
                {formatDate(rental.created_at)}
              </div>
            </div>
          </div>

          {/* Rejection Reason */}
          {rental.rental_status === 'rejected' && rental.rejection_reason && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-lg md:rounded-xl p-2 md:p-4">
              <div className="flex items-start gap-2 md:gap-3">
                <div className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <XCircle className="w-2.5 h-2.5 md:w-4 md:h-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <div className="text-xs md:text-sm font-medium text-red-800 mb-0.5 md:mb-1">Rejection Reason</div>
                  <div className="text-xs md:text-sm text-red-700 leading-relaxed">{rental.rejection_reason}</div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Upload Section */}
          {rental.rental_status === 'confirmed' && (
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg md:rounded-xl p-2 md:p-4">
              <PaymentUploadSection rental={rental} onUploadComplete={onUploadComplete} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ title, subtitle, icon: Icon }) => (
  <div className="py-12 md:py-16 text-center">
    <div className="mx-auto w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-slate-100 to-gray-100 flex items-center justify-center mb-3 md:mb-4 shadow-sm">
      <Icon className="w-6 h-6 md:w-8 md:h-8 text-slate-400" />
    </div>
    <div className="max-w-sm mx-auto px-4">
      <h4 className="text-base md:text-lg font-medium md:font-semibold text-slate-800 mb-1 md:mb-2">{title}</h4>
      <p className="text-xs md:text-sm text-slate-500 leading-relaxed">{subtitle}</p>
    </div>
  </div>
);

const Requests = () => {
  const { user, loading: authLoading } = useAuthStore();
  const { rentals, loading, error, loadRentals } = useRentalStore();
  const subscriptionRef = useRef(null);

  const handleUploadComplete = () => {
    // Refresh rentals data after successful upload
    if (user?.id) {
      loadRentals(user.id);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadRentals(user.id);

      if (!subscriptionRef.current) {
        subscriptionRef.current = subscribeToRentalUpdates(user.id, 'user');
      }
    }

    return () => {
      if (subscriptionRef.current) {
        unsubscribeFromRentalUpdates(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [user?.id, loadRentals]);

  const { pending, confirmedUpcoming, rejected } = useMemo(() => {
    const groups = { pending: [], confirmedUpcoming: [], rejected: [] };
    for (const r of rentals) {
      if (r.rental_status === 'pending') groups.pending.push(r);
      else if (r.rental_status === 'rejected') groups.rejected.push(r);
      else if (r.rental_status === 'confirmed' && isUpcoming(r.start_date)) groups.confirmedUpcoming.push(r);
    }
    
    // Sort confirmed upcoming rentals - those without payment come first
    groups.confirmedUpcoming.sort((a, b) => {
      // Check if payment exists
      const aHasPayment = a.payments && a.payments.length > 0;
      const bHasPayment = b.payments && b.payments.length > 0;
      
      // If one has payment and other doesn't, prioritize the one without payment
      if (!aHasPayment && bHasPayment) return -1;
      if (aHasPayment && !bHasPayment) return 1;
      
      // If both have same payment status, sort by start date (earliest first)
      return new Date(a.start_date) - new Date(b.start_date);
    });
    
    return groups;
  }, [rentals]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-white shadow-lg flex items-center justify-center mb-4">
            <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
          </div>
          <p className="text-slate-600 font-medium">Checking your session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center p-6">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-3">Authentication Required</h2>
          <p className="text-slate-600 leading-relaxed">Please log in to view your rental requests and track their status.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-3 md:px-6 py-4 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
              <Calendar className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <h1 className="text-xl md:text-3xl font-semibold md:font-bold text-slate-800">My Requests</h1>
          </div>
          <p className="text-xs md:text-base text-slate-600 leading-relaxed max-w-2xl px-1 md:px-0">
            Track your rental applications and manage upcoming confirmed rentals. Stay updated with real-time status changes.
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-white shadow-lg flex items-center justify-center mb-4">
                <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
              </div>
              <p className="text-slate-600 font-medium">Loading your requests...</p>
            </div>
          </div>
        ) : (
          /* Main Content */
          <div className="space-y-4 md:space-y-8">
            <Section title="Pending Review" count={pending.length} icon={Clock}>
              {pending.length === 0 ? (
                <EmptyState 
                  title="No pending requests" 
                  subtitle="Once you submit a rental request, it will appear here while awaiting admin review."
                  icon={Clock}
                />
              ) : (
                pending.map(r => (
                  <RequestRow key={r.id} rental={r} onUploadComplete={handleUploadComplete} />
                ))
              )}
            </Section>

            <Section title="Confirmed & Upcoming" count={confirmedUpcoming.length} icon={CheckCircle2}>
              {confirmedUpcoming.length === 0 ? (
                <EmptyState 
                  title="No upcoming rentals" 
                  subtitle="Confirmed rentals that haven't started yet will appear here with payment upload options."
                  icon={CheckCircle2}
                />
              ) : (
                confirmedUpcoming.map(r => (
                  <RequestRow key={r.id} rental={r} onUploadComplete={handleUploadComplete} />
                ))
              )}
            </Section>

            <Section title="Rejected Requests" count={rejected.length} icon={XCircle}>
              {rejected.length === 0 ? (
                <EmptyState 
                  title="No rejected requests" 
                  subtitle="If a rental request is declined by an admin, it will appear here with the rejection reason."
                  icon={XCircle}
                />
              ) : (
                rejected.map(r => (
                  <RequestRow key={r.id} rental={r} onUploadComplete={handleUploadComplete} />
                ))
              )}
            </Section>
          </div>
        )}

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