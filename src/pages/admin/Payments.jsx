// src/pages/admin/Payments.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Eye, Calendar, User, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { 
  adminGetSubmittedPayments, 
  adminVerifyRentalPayment, 
  adminVerifyExtensionPayment 
} from '../../services/paymentService';
import { subscribeToAllPayments, unsubscribeFromChannel } from '../../services/realtimeService';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await adminGetSubmittedPayments();
        if (response.success) {
          setPayments(response.data);
        } else {
          console.error('API Error:', response.error);
        }
      } catch (error) {
        console.error('Error fetching payments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();

    const channel = subscribeToAllPayments((payload) => {
      setPayments(prev => {
        const updated = [...prev];
        
        switch (payload.eventType) {
          case 'INSERT':
          case 'UPDATE':
            if (payload.new.payment_status === 'submitted') {
              const existingIndex = updated.findIndex(p => p.id === payload.new.id);
              if (existingIndex > -1) {
                updated[existingIndex] = payload.new;
              } else {
                updated.unshift(payload.new);
              }
            } else {
              const removeIndex = updated.findIndex(p => p.id === payload.new.id);
              if (removeIndex > -1) {
                updated.splice(removeIndex, 1);
              }
            }
            break;
          case 'DELETE':
            const deleteIndex = updated.findIndex(p => p.id === payload.old.id);
            if (deleteIndex > -1) {
              updated.splice(deleteIndex, 1);
            }
            break;
        }
        return updated;
      });
    });

    channelRef.current = channel;

    return () => {
      // Use the service function for cleanup
      if (channelRef.current) {
        unsubscribeFromChannel(channelRef.current);
      }
    };
  }, []); // Empty dependency array

  const handleVerifyPayment = async (paymentId, paymentType) => {
    let result;
    if (paymentType === 'rental') {
      result = await adminVerifyRentalPayment(paymentId);
    } else if (paymentType === 'extension') {
      result = await adminVerifyExtensionPayment(paymentId);
    }

    if (result.success) {
      console.log('Payment verified successfully');
    } else {
      console.error('Failed to verify payment:', result.error);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 bg-slate-50 min-h-screen">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Payment Applications</h1>
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Payment Applications</h1>

      {payments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
          <CreditCard className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-1">No pending payments</h3>
          <p className="text-slate-500">There are no submitted payment applications to review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <div key={payment.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              {/* Header - User & Payment Type */}
              <div className="bg-slate-800 text-white p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5" />
                    <div>
                      <p className="font-medium">
                        {payment.users?.first_name} {payment.users?.last_name}
                      </p>
                      <p className="text-sm text-slate-300">{payment.users?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      payment.payment_type === 'rental' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {payment.payment_type}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {payment.payment_status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Body - Details */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rental Details */}
                <div className="border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0 md:pr-4">
                  <h3 className="font-medium text-slate-900 mb-2 flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-slate-500" />
                    Rental Details
                  </h3>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li><span className="font-medium">Rental ID:</span> {payment.rental_id}</li>
                    <li><span className="font-medium">Dates:</span> {payment.rentals?.start_date} to {payment.rentals?.end_date}</li>
                    <li><span className="font-medium">Total Price:</span> ₱{Number(payment.rentals?.total_price).toLocaleString('en-PH')}</li>
                    <li><span className="font-medium">Status:</span> {payment.rentals?.rental_status}</li>
                  </ul>
                </div>

                {/* Payment Details */}
                <div className="pb-4">
                  <h3 className="font-medium text-slate-900 mb-2 flex items-center">
                    <CreditCard className="h-4 w-4 mr-1 text-slate-500" />
                    Payment Details
                  </h3>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li><span className="font-medium">Amount:</span> ₱{Number(payment.amount).toLocaleString('en-PH')}</li>
                    <li><span className="font-medium">Method:</span> {payment.payment_method || 'N/A'}</li>
                    <li><span className="font-medium">Reference:</span> {payment.payment_reference || 'N/A'}</li>
                    <li>
                      <span className="font-medium">Receipt:</span> 
                      {payment.payment_receipt_url ? (
                        <a 
                          href={payment.payment_receipt_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-1 text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-1" /> View
                        </a>
                      ) : (
                        <span className="ml-1 text-slate-400">No receipt</span>
                      )}
                    </li>
                  </ul>
                </div>
              </div>

              {/* Footer - Actions */}
              <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => handleVerifyPayment(payment.id, payment.payment_type)}
                  className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Verify Payment
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Payments;