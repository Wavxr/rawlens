import React, { useState, useEffect } from 'react';
import { X, Calendar, Camera, User, DollarSign, Upload, AlertCircle } from 'lucide-react';
import useAuthStore from '../../stores/useAuthStore';
import { createAdminExtension, checkExtensionEligibility, checkCameraAvailabilityForExtension } from '../../services/extensionService';

const ExtendBookingModal = ({ isOpen, onClose, booking }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [newEndDate, setNewEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentFile, setPaymentFile] = useState(null);
  const [paymentPreview, setPaymentPreview] = useState(null);
  
  // Calculated values
  const [extensionDays, setExtensionDays] = useState(0);
  const [additionalPrice, setAdditionalPrice] = useState(0);
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [isEligible, setIsEligible] = useState(false);

  useEffect(() => {
    if (isOpen && booking) {
      resetForm();
      checkEligibility();
    }
  }, [isOpen, booking]);

  useEffect(() => {
    if (newEndDate && booking) {
      calculateExtension();
    }
  }, [newEndDate, booking]);

  const resetForm = () => {
    setNewEndDate('');
    setNotes('');
    setPaymentFile(null);
    setPaymentPreview(null);
    setExtensionDays(0);
    setAdditionalPrice(0);
    setError(null);
    setSuccess(false);
    setEligibilityChecked(false);
    setIsEligible(false);
  };

  const checkEligibility = async () => {
    if (!booking) return;

    try {
      const result = await checkExtensionEligibility(booking.id);
      setIsEligible(result.isEligible);
      if (!result.isEligible) {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to check extension eligibility');
    } finally {
      setEligibilityChecked(true);
    }
  };

  const calculateExtension = () => {
    if (!newEndDate || !booking) return;

    const currentEnd = new Date(booking.end_date);
    const newEnd = new Date(newEndDate);
    currentEnd.setHours(0, 0, 0, 0);
    newEnd.setHours(0, 0, 0, 0);

    if (newEnd <= currentEnd) {
      setExtensionDays(0);
      setAdditionalPrice(0);
      return;
    }

    const days = Math.ceil((newEnd - currentEnd) / (1000 * 3600 * 24));
    setExtensionDays(days);
    setAdditionalPrice(days * (booking.price_per_day || 0));
  };

  const handlePaymentFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPaymentFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPaymentPreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setPaymentPreview(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!booking || !user || !newEndDate) return;
    if (!paymentFile) {
      setError('Please upload payment proof');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check availability before creating extension
      const availabilityResult = await checkCameraAvailabilityForExtension(booking.id, newEndDate);
      if (!availabilityResult.isAvailable) {
        setError(availabilityResult.error);
        setLoading(false);
        return;
      }

      const extensionData = {
        adminId: user.id,
        newEndDate,
        notes: notes.trim() || null
      };

      const result = await createAdminExtension(booking.id, extensionData, paymentFile);
      
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError(error.message || 'Failed to create extension');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMinDate = () => {
    if (!booking?.end_date) return '';
    const tomorrow = new Date(booking.end_date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Extend Rental
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Booking Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Current Booking Details</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-900 dark:text-white">
                  {booking.camera?.name || 'Camera'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {booking.user ? `${booking.user.first_name} ${booking.user.last_name}` : booking.customer_name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Current: {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  ₱{booking.price_per_day}/day
                </span>
              </div>
            </div>
          </div>

          {/* Eligibility Check */}
          {eligibilityChecked && !isEligible && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Extension Not Available
                </h4>
              </div>
              <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {eligibilityChecked && isEligible && (
            <>
              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Extension request created successfully! Closing...
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* New End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New End Date
                  </label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    min={getMinDate()}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {newEndDate && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      New end: {formatDate(newEndDate)}
                    </p>
                  )}
                </div>

                {/* Extension Summary */}
                {extensionDays > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                      Extension Summary
                    </h4>
                    <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                      <p>Additional Days: {extensionDays}</p>
                      <p>Additional Cost: ₱{additionalPrice}</p>
                    </div>
                  </div>
                )}

                {/* Payment Proof */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Proof *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handlePaymentFileChange}
                      className="w-full text-sm text-gray-500 dark:text-gray-400"
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Upload payment receipt or screenshot (PNG, JPG, PDF)
                    </p>
                  </div>
                  
                  {paymentPreview && (
                    <div className="mt-3">
                      <img 
                        src={paymentPreview} 
                        alt="Payment proof preview"
                        className="max-w-full h-32 object-contain border border-gray-200 dark:border-gray-600 rounded"
                      />
                    </div>
                  )}
                  
                  {paymentFile && !paymentPreview && (
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      Selected: {paymentFile.name}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Add any notes about this extension..."
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !newEndDate || !paymentFile || extensionDays <= 0}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    {loading ? 'Creating Extension...' : 'Create Extension'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExtendBookingModal;