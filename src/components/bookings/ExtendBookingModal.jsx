import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Calendar, Camera, User, DollarSign, Upload, AlertCircle } from 'lucide-react';
import useAuthStore from '../../stores/useAuthStore';
import { createAdminExtension, checkExtensionEligibility, checkCameraAvailabilityForExtension } from '../../services/extensionService';
import useBackHandler from '../../hooks/useBackHandler';

const ExtendBookingModal = ({ isOpen, onClose, booking }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [newEndDate, setNewEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentFile, setPaymentFile] = useState(null);
  const [paymentPreview, setPaymentPreview] = useState(null);
  
  const [extensionDays, setExtensionDays] = useState(0);
  const [additionalPrice, setAdditionalPrice] = useState(0);
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [isEligible, setIsEligible] = useState(false);

  // Handle mobile back button - close modal when back is pressed
  useBackHandler(isOpen, () => {
    if (!loading) {
      onClose();
    }
  }, 100);

  const resetForm = useCallback(() => {
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
  }, []);

  const checkEligibility = useCallback(async () => {
    if (!booking) return;

    try {
      const result = await checkExtensionEligibility(booking.id);
      setIsEligible(result.isEligible);
      if (!result.isEligible) {
        setError(result.error);
      }
    } catch {
      setError('Failed to check extension eligibility');
    } finally {
      setEligibilityChecked(true);
    }
  }, [booking]);

  const calculateExtension = useCallback(() => {
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
  }, [newEndDate, booking]);

  useEffect(() => {
    if (isOpen && booking) {
      resetForm();
      checkEligibility();
    }
  }, [isOpen, booking, resetForm, checkEligibility]);

  useEffect(() => {
    if (newEndDate && booking) {
      calculateExtension();
    }
  }, [newEndDate, booking, calculateExtension]);

  const handlePaymentFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      setPaymentFile(file);
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPaymentPreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setPaymentPreview(null);
      }
    }
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!booking || !user || !newEndDate) return;
    if (!paymentFile) {
      setError('Please upload payment proof');
      return;
    }

    setLoading(true);
    setError(null);

    try {
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
  }, [booking, user, newEndDate, paymentFile, notes, onClose]);

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  const getMinDate = useCallback(() => {
    if (!booking?.end_date) return '';
    const tomorrow = new Date(booking.end_date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }, [booking?.end_date]);

  const themeClasses = useMemo(() => ({
    modalBg: 'bg-white dark:bg-gray-800',
    headerBorder: 'border-b border-gray-200 dark:border-gray-700',
    textColor: 'text-gray-900 dark:text-white',
    textSecondary: 'text-gray-700 dark:text-gray-300',
    textTertiary: 'text-gray-600 dark:text-gray-300',
    inputBg: 'bg-white dark:bg-gray-700',
    inputText: 'text-gray-900 dark:text-white',
    inputBorder: 'border-gray-300 dark:border-gray-600',
    infoBg: 'bg-gray-50 dark:bg-gray-700',
    infoText: 'text-gray-900 dark:text-white',
    infoSecondary: 'text-gray-600 dark:text-gray-300',
    eligibilityErrorBg: 'bg-red-50 dark:bg-red-900/20',
    eligibilityErrorBorder: 'border-red-200 dark:border-red-700',
    eligibilityErrorText: 'text-red-800 dark:text-red-200',
    eligibilityErrorDesc: 'text-red-700 dark:text-red-300',
    successBg: 'bg-green-50 dark:bg-green-900/20',
    successBorder: 'border-green-200 dark:border-green-700',
    successText: 'text-green-800 dark:text-green-200',
    extensionSummaryBg: 'bg-blue-50 dark:bg-blue-900/20',
    extensionSummaryBorder: 'border-blue-200 dark:border-blue-700',
    extensionSummaryText: 'text-blue-800 dark:text-blue-200',
    extensionSummaryValue: 'text-blue-700 dark:text-blue-300',
    uploadBorder: 'border-dashed border-gray-300 dark:border-gray-600',
    uploadText: 'text-gray-500 dark:text-gray-400',
    uploadPreviewBorder: 'border-gray-200 dark:border-gray-600',
    cancelText: 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100',
    submitButton: 'bg-blue-600 text-white rounded hover:bg-blue-700'
  }), []);

  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${themeClasses.modalBg}`}>
        <div className={`flex items-center justify-between p-6 ${themeClasses.headerBorder}`}>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className={`text-xl font-semibold ${themeClasses.textColor}`}>
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
          <div className={`${themeClasses.infoBg} rounded-lg p-4 mb-6`}>
            <h3 className={`text-sm font-medium ${themeClasses.textSecondary} mb-3`}>Current Booking Details</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-gray-400" />
                <span className={`text-sm ${themeClasses.infoText}`}>
                  {booking.camera?.name || 'Camera'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className={`text-sm ${themeClasses.infoSecondary}`}>
                  {booking.user ? `${booking.user.first_name} ${booking.user.last_name}` : booking.customer_name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className={`text-sm ${themeClasses.infoSecondary}`}>
                  Current: {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span className={`text-sm ${themeClasses.infoSecondary}`}>
                  ₱{booking.price_per_day}/day
                </span>
              </div>
            </div>
          </div>

          {eligibilityChecked && !isEligible && (
            <div className={`${themeClasses.eligibilityErrorBg} ${themeClasses.eligibilityErrorBorder} rounded-lg p-4 mb-6`}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h4 className={`text-sm font-medium ${themeClasses.eligibilityErrorText}`}>
                  Extension Not Available
                </h4>
              </div>
              <p className={`mt-2 text-sm ${themeClasses.eligibilityErrorDesc}`}>{error}</p>
            </div>
          )}

          {eligibilityChecked && isEligible && (
            <>
              {success && (
                <div className={`${themeClasses.successBg} ${themeClasses.successBorder} rounded-lg p-4 mb-6`}>
                  <p className={`text-sm ${themeClasses.successText}`}>
                    Extension request created successfully! Closing...
                  </p>
                </div>
              )}

              {error && (
                <div className={`${themeClasses.eligibilityErrorBg} ${themeClasses.eligibilityErrorBorder} rounded-lg p-4 mb-6`}>
                  <p className={`text-sm ${themeClasses.eligibilityErrorText}`}>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-2`}>
                    New End Date
                  </label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    min={getMinDate()}
                    required
                    className={`w-full px-3 py-2 border ${themeClasses.inputBorder} rounded-md ${themeClasses.inputBg} ${themeClasses.inputText}`}
                  />
                  {newEndDate && (
                    <p className={`mt-1 text-sm ${themeClasses.uploadText}`}>
                      New end: {formatDate(newEndDate)}
                    </p>
                  )}
                </div>

                {extensionDays > 0 && (
                  <div className={`${themeClasses.extensionSummaryBg} ${themeClasses.extensionSummaryBorder} rounded-lg p-4`}>
                    <h4 className={`text-sm font-medium ${themeClasses.extensionSummaryText} mb-2`}>
                      Extension Summary
                    </h4>
                    <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                      <p>Additional Days: {extensionDays}</p>
                      <p>Additional Cost: ₱{additionalPrice}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-2`}>
                    Payment Proof *
                  </label>
                  <div className={`border-2 ${themeClasses.uploadBorder} rounded-lg p-4`}>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handlePaymentFileChange}
                      className={`w-full text-sm ${themeClasses.uploadText}`}
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
                        className={`max-w-full h-32 object-contain border ${themeClasses.uploadPreviewBorder} rounded`}
                      />
                    </div>
                  )}
                  
                  {paymentFile && !paymentPreview && (
                    <div className={`mt-3 text-sm ${themeClasses.textTertiary}`}>
                      Selected: {paymentFile.name}
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-2`}>
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows="3"
                    className={`w-full px-3 py-2 border ${themeClasses.inputBorder} rounded-md ${themeClasses.inputBg} ${themeClasses.inputText}`}
                    placeholder="Add any notes about this extension..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className={`px-4 py-2 text-sm ${themeClasses.cancelText} disabled:opacity-50`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !newEndDate || !paymentFile || extensionDays <= 0}
                    className={`px-4 py-2 text-sm ${themeClasses.submitButton} disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
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