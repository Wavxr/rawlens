import React, { useState, useEffect } from 'react';
import { X, Camera, Calendar, User, Phone, Mail, DollarSign } from 'lucide-react';
import { updatePotentialBooking, calculateQuickBookingPrice } from '../../services/bookingService';

const EditPotentialBookingModal = ({
  open,
  onClose,
  booking,
  cameras,
  onSuccess,
  isDarkMode
}) => {
  const [formData, setFormData] = useState({
    cameraId: '',
    startDate: '',
    endDate: '',
    customerName: '',
    customerContact: '',
    customerEmail: ''
  });

  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize form with booking data
  useEffect(() => {
    if (open && booking) {
      setFormData({
        cameraId: booking.camera_id || '',
        startDate: booking.start_date || '',
        endDate: booking.end_date || '',
        customerName: booking.customer_name || '',
        customerContact: booking.customer_contact || '',
        customerEmail: booking.customer_email || ''
      });
      setPricing(null);
      setErrors({});
    }
  }, [open, booking]);

  // Calculate pricing when camera or dates change
  useEffect(() => {
    if (formData.cameraId && formData.startDate && formData.endDate) {
      calculatePricing();
    } else {
      setPricing(null);
    }
  }, [formData.cameraId, formData.startDate, formData.endDate]);

  const calculatePricing = async () => {
    try {
      const result = await calculateQuickBookingPrice(
        formData.cameraId,
        formData.startDate,
        formData.endDate
      );
      setPricing(result);
    } catch (error) {
      console.error('Error calculating pricing:', error);
      setPricing(null);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.cameraId) newErrors.cameraId = 'Camera is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (!formData.customerName.trim()) newErrors.customerName = 'Customer name is required';
    if (!formData.customerContact.trim()) newErrors.customerContact = 'Contact is required';

    // Validate date range
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await updatePotentialBooking(booking.id, {
        cameraId: formData.cameraId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        customerName: formData.customerName,
        customerContact: formData.customerContact,
        customerEmail: formData.customerEmail || null
      });

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setErrors({ submit: result.error });
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      setErrors({ submit: 'Failed to update booking' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!open || !booking) return null;

  // Theme classes
  const bgColor = isDarkMode ? 'bg-gray-900' : 'bg-white';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-slate-200';
  const textColor = isDarkMode ? 'text-gray-100' : 'text-slate-800';
  const secondaryTextColor = isDarkMode ? 'text-gray-400' : 'text-slate-600';
  const inputBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const inputBorder = isDarkMode ? 'border-gray-600' : 'border-slate-300';
  const inputText = isDarkMode ? 'text-gray-100' : 'text-slate-900';
  const labelColor = isDarkMode ? 'text-gray-300' : 'text-slate-700';
  const errorColor = isDarkMode ? 'text-red-400' : 'text-red-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      
      <div className={`relative rounded-lg shadow-xl w-full max-w-2xl mx-4 border ${bgColor} ${borderColor}`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${borderColor}`}>
          <h3 className={`text-lg font-semibold ${textColor}`}>Edit Potential Booking</h3>
          <button onClick={onClose} className={`text-gray-400 hover:text-gray-600`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-6">
            {/* Camera Selection */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${labelColor}`}>
                <Camera className="w-4 h-4 inline mr-2" />
                Camera
              </label>
              <select
                value={formData.cameraId}
                onChange={(e) => handleInputChange('cameraId', e.target.value)}
                className={`w-full p-3 border rounded-lg ${inputBg} ${inputBorder} ${inputText} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">Select a camera</option>
                {cameras.map(camera => (
                  <option key={camera.id} value={camera.id}>
                    {camera.name}
                  </option>
                ))}
              </select>
              {errors.cameraId && <p className={`text-sm mt-1 ${errorColor}`}>{errors.cameraId}</p>}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${labelColor}`}>
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className={`w-full p-3 border rounded-lg ${inputBg} ${inputBorder} ${inputText} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {errors.startDate && <p className={`text-sm mt-1 ${errorColor}`}>{errors.startDate}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${labelColor}`}>
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className={`w-full p-3 border rounded-lg ${inputBg} ${inputBorder} ${inputText} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {errors.endDate && <p className={`text-sm mt-1 ${errorColor}`}>{errors.endDate}</p>}
              </div>
            </div>

            {/* Pricing Display */}
            {pricing && (
              <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className={`w-4 h-4 ${secondaryTextColor}`} />
                  <span className={`font-medium ${textColor}`}>Updated Pricing</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className={secondaryTextColor}>Duration</span>
                    <p className={`font-medium ${textColor}`}>{pricing.rentalDays} days</p>
                  </div>
                  <div>
                    <span className={secondaryTextColor}>Rate</span>
                    <p className={`font-medium ${textColor}`}>₱{pricing.pricePerDay}/day</p>
                  </div>
                  <div>
                    <span className={secondaryTextColor}>Total</span>
                    <p className={`font-medium text-lg ${textColor}`}>₱{pricing.totalPrice.toFixed(2)}</p>
                  </div>
                </div>
                {pricing.tierDescription && (
                  <p className={`text-xs mt-2 ${secondaryTextColor}`}>
                    Tier: {pricing.tierDescription}
                  </p>
                )}
              </div>
            )}

            {/* Customer Information */}
            <div className="space-y-4">
              <h4 className={`text-lg font-medium ${textColor}`}>Customer Information</h4>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${labelColor}`}>
                  <User className="w-4 h-4 inline mr-2" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  className={`w-full p-3 border rounded-lg ${inputBg} ${inputBorder} ${inputText} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Enter customer's full name"
                />
                {errors.customerName && <p className={`text-sm mt-1 ${errorColor}`}>{errors.customerName}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${labelColor}`}>
                  <Phone className="w-4 h-4 inline mr-2" />
                  Contact Number
                </label>
                <input
                  type="text"
                  value={formData.customerContact}
                  onChange={(e) => handleInputChange('customerContact', e.target.value)}
                  className={`w-full p-3 border rounded-lg ${inputBg} ${inputBorder} ${inputText} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Phone number or Instagram handle"
                />
                {errors.customerContact && <p className={`text-sm mt-1 ${errorColor}`}>{errors.customerContact}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${labelColor}`}>
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                  className={`w-full p-3 border rounded-lg ${inputBg} ${inputBorder} ${inputText} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="customer@example.com"
                />
              </div>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className={`p-3 rounded border ${isDarkMode ? 'bg-red-900/30 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {errors.submit}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 border rounded-lg transition ${
                isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition`}
            >
              {loading ? 'Updating...' : 'Update Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPotentialBookingModal;
