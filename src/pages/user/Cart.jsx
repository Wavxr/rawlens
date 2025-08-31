import React, { useEffect, useMemo, useState, useRef } from 'react';
import useAuthStore from '../../stores/useAuthStore';
import useRentalStore from '../../stores/rentalStore';
import { subscribeToRentalUpdates, unsubscribeFromRentalUpdates } from '../../services/realtimeService';
import { Loader2, Calendar, Camera as CameraIcon, AlertCircle } from 'lucide-react';
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
  const map = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
  };
  return (
    <span className={`px-2 py-0.5 text-xs border rounded ${map[status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {status}
    </span>
  );
};

const Section = ({ title, count, children }) => (
  <section className="bg-white border border-gray-200 rounded-xl">
    <div className="px-4 py-3 border-b flex items-center justify-between">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <span className="text-xs text-gray-500">{count} item{count === 1 ? '' : 's'}</span>
    </div>
    <div>{children}</div>
  </section>
);

const RequestRow = ({ rental, onUploadComplete }) => {
  const camera = rental.cameras || {};
  const dateRange = `${formatDate(rental.start_date)} — ${formatDate(rental.end_date)}`;
  return (
    <div className="px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 transition">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded overflow-hidden bg-gray-100 flex items-center justify-center border flex-shrink-0">
          {camera.image_url ? (
            <img
              src={camera.image_url}
              alt={camera.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <CameraIcon className="w-6 h-6 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-medium text-gray-900 truncate">{camera.name || 'Camera'}</div>
            <StatusPill status={rental.rental_status} />
          </div>
          <div className="mt-1 text-sm text-gray-600 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>{dateRange}</span>
          </div>
          {rental.rental_status === 'rejected' && rental.rejection_reason && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
              <span className="font-medium">Rejection reason:</span> {rental.rejection_reason}
            </div>
          )}
          {rental.rental_status === 'confirmed' && (
            <PaymentUploadSection rental={rental} onUploadComplete={onUploadComplete} />
          )}
        </div>
        <div className="text-right text-sm text-gray-500 flex-shrink-0">
          <div>Submitted</div>
          <div className="font-medium text-gray-700">{formatDate(rental.created_at)}</div>
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ title, subtitle }) => (
  <div className="py-12 text-center text-gray-600">
    <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
      <AlertCircle className="w-6 h-6 text-gray-400" />
    </div>
    <div className="font-medium text-gray-900">{title}</div>
    <div className="text-sm text-gray-500 mt-1">{subtitle}</div>
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
    return groups;
  }, [rentals]);

  if (authLoading) {
    return (
      <div className="p-6 flex items-center justify-center text-gray-600">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Checking your session...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <EmptyState title="You are not logged in" subtitle="Please log in to view your rental requests." />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Requests</h1>
        <p className="text-gray-600 mt-1">Track your rental applications and upcoming confirmed rentals.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 border border-red-200 bg-red-50 text-red-700 rounded">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading your requests...
        </div>
      ) : (
        <div className="space-y-6">
          <Section title="Pending" count={pending.length}>
            {pending.length === 0 ? (
              <EmptyState title="No pending requests" subtitle="Once you submit a rental request, it will appear here while awaiting review." />
            ) : (
              <div>
                {pending.map(r => (
                  <RequestRow key={r.id} rental={r} onUploadComplete={handleUploadComplete} />
                ))}
              </div>
            )}
          </Section>

          <Section title="Confirmed (upcoming)" count={confirmedUpcoming.length}>
            {confirmedUpcoming.length === 0 ? (
              <EmptyState title="No upcoming confirmed rentals" subtitle="Confirmed rentals that have not started yet will show up here." />
            ) : (
              <div>
                {confirmedUpcoming.map(r => (
                  <RequestRow key={r.id} rental={r} onUploadComplete={handleUploadComplete} />
                ))}
              </div>
            )}
          </Section>

          <Section title="Rejected" count={rejected.length}>
            {rejected.length === 0 ? (
              <EmptyState title="No rejected requests" subtitle="If a request is rejected by admin, it will appear here." />
            ) : (
              <div>
                {rejected.map(r => (
                  <RequestRow key={r.id} rental={r} onUploadComplete={handleUploadComplete} />
                ))}
              </div>
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
  );
};

export default Requests;