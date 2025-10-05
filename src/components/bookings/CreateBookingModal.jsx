import React, { useState, useEffect } from 'react';
import { X, Camera, Calendar, User, Phone, Mail, DollarSign, AlertTriangle } from 'lucide-react';
import DateFilterInput from '../forms/DateFilterInput';
import { createQuickBooking, calculateQuickBookingPrice } from '../../services/bookingService';
import FileUploadZone from './FileUploadZone';

const CreateBookingModal = ({
  open,
  onClose,
  cameras,
  preselectedCamera,
  preselectedDateRange,
  onSuccess,
  isDarkMode
}) => {
  const [formData, setFormData] = useState({
    cameraId: '',
    startDate: '',
    endDate: '',
    customerName: '',
    customerContact: '',
    customerEmail: '',
    bookingType: 'confirmed'
  });

  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [contractFile, setContractFile] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [uploadErrors, setUploadErrors] = useState({ contract: '', receipt: '' });
  const [submissionWarnings, setSubmissionWarnings] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [bookingTypeTouched, setBookingTypeTouched] = useState(false);

  // Initialize form with preselected values
  useEffect(() => {
    if (open) {
      setFormData({
        cameraId: preselectedCamera?.id || '',
        startDate: preselectedDateRange?.startDate || '',
        endDate: preselectedDateRange?.endDate || '',
        customerName: '',
        customerContact: '',
        customerEmail: '',
        bookingType: 'confirmed'
      });
      setPricing(null);
      setErrors({});
      setContractFile(null);
      setReceiptFile(null);
      setReceiptPreview(null);
      setUploadErrors({ contract: '', receipt: '' });
      setSubmissionWarnings([]);
      setSubmitted(false);
      setBookingTypeTouched(false);
    }
  }, [open, preselectedCamera, preselectedDateRange]);

  // Calculate pricing when camera or dates change
  useEffect(() => {
    if (formData.cameraId && formData.startDate && formData.endDate) {
      calculatePricing();
    } else {
      setPricing(null);
    }
  }, [formData.cameraId, formData.startDate, formData.endDate]);

  // Auto-select completed status when both dates are in the past (unless manually overridden)
  useEffect(() => {
    if (!open || bookingTypeTouched) return;
    if (!formData.startDate || !formData.endDate) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (start < today && end < today) {
      setFormData(prev => {
        if (prev.bookingType === 'completed') {
          return prev;
        }
        return { ...prev, bookingType: 'completed' };
      });
    }
  }, [formData.startDate, formData.endDate, open, bookingTypeTouched]);

  useEffect(() => {
    if (!receiptFile) {
      setReceiptPreview(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    if (receiptFile.type?.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(receiptFile);
      setReceiptPreview(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return previewUrl;
      });
      return () => URL.revokeObjectURL(previewUrl);
    }

    setReceiptPreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [receiptFile]);

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
    
    if (submitted) {
      return;
    }

    if (!validateForm()) return;

    setSubmissionWarnings([]);
    setLoading(true);
    try {
      const result = await createQuickBooking({
        cameraId: formData.cameraId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        customerName: formData.customerName,
        customerContact: formData.customerContact,
        customerEmail: formData.customerEmail || null,
        bookingType: formData.bookingType
      }, {
        contractFile,
        receiptFile
      });

      if (result.success) {
        setSubmitted(true);
        if (result.warnings?.length) {
          setSubmissionWarnings(result.warnings);
          onSuccess();
        } else {
          onSuccess();
          onClose();
        }
      } else {
        setErrors({ submit: result.error });
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      setErrors({ submit: 'Failed to create booking' });
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

  const handleBookingTypeSelect = (value) => {
    setBookingTypeTouched(true);
    handleInputChange('bookingType', value);
  };

  const handleContractSelect = (file, validationError) => {
    if (validationError) {
      setUploadErrors(prev => ({ ...prev, contract: validationError.message }));
      setContractFile(null);
      return;
    }

    if (file && file.type !== 'application/pdf') {
      setUploadErrors(prev => ({ ...prev, contract: 'Contract must be a PDF file.' }));
      setContractFile(null);
      return;
    }

    setUploadErrors(prev => ({ ...prev, contract: '' }));
    setContractFile(file || null);
  };

  const handleReceiptSelect = (file, validationError) => {
    if (validationError) {
      setUploadErrors(prev => ({ ...prev, receipt: validationError.message }));
      setReceiptFile(null);
      return;
    }

    if (file && !file.type?.startsWith('image/')) {
      setUploadErrors(prev => ({ ...prev, receipt: 'Receipt must be an image file.' }));
      setReceiptFile(null);
      return;
    }

    setUploadErrors(prev => ({ ...prev, receipt: '' }));
    setReceiptFile(file || null);
  };

  const clearReceipt = () => {
    setReceiptFile(null);
    setUploadErrors(prev => ({ ...prev, receipt: '' }));
  };

  const clearContract = () => {
    setContractFile(null);
    setUploadErrors(prev => ({ ...prev, contract: '' }));
  };

  const submitLabelMap = {
    confirmed: 'Create Confirmed Booking',
    potential: 'Create Potential Booking',
    completed: 'Save Completed Booking'
  };

  const submitLabel = submitLabelMap[formData.bookingType] || 'Create Booking';

  if (!open) return null;

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
  const sectionBg = isDarkMode ? 'bg-gray-800' : 'bg-slate-50';
  const sectionBorder = isDarkMode ? 'border-gray-600' : 'border-slate-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      
      <div className={`relative rounded-lg shadow-xl w-full max-w-2xl mx-4 border ${bgColor} ${borderColor}`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${borderColor}`}>
          <h3 className={`text-lg font-semibold ${textColor}`}>Create New Booking</h3>
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
                    {camera.serial_number && ` (#${camera.serial_number})`}
                  </option>
                ))}
              </select>
              {errors.cameraId && <p className={`text-sm mt-1 ${errorColor}`}>{errors.cameraId}</p>}
            </div>

            {/* Date Range (using shared DateFilterInput without min restriction) */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${labelColor}`}>
                <Calendar className="w-4 h-4 inline mr-2" />
                Rental Dates
              </label>
              <DateFilterInput
                layout="horizontal"
                ignoreStartMin={true}
                theme={isDarkMode ? 'dark' : 'light'}
                startDate={formData.startDate}
                endDate={formData.endDate}
                onStartDateChange={(e) => handleInputChange('startDate', e.target.value)}
                onEndDateChange={(e) => handleInputChange('endDate', e.target.value)}
                idPrefix="create-booking"
              />
              {errors.startDate && <p className={`text-sm mt-1 ${errorColor}`}>{errors.startDate}</p>}
              {errors.endDate && <p className={`text-sm mt-1 ${errorColor}`}>{errors.endDate}</p>}
            </div>

            {/* Pricing Display */}
            {pricing && (
              <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className={`w-4 h-4 ${secondaryTextColor}`} />
                  <span className={`font-medium ${textColor}`}>Pricing Details</span>
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

            {/* Booking Type */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${labelColor}`}>
                Booking Status
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="confirmed"
                    checked={formData.bookingType === 'confirmed'}
                    onChange={(e) => handleBookingTypeSelect(e.target.value)}
                    className="mr-2"
                  />
                  <span className={textColor}>Confirmed</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="potential"
                    checked={formData.bookingType === 'potential'}
                    onChange={(e) => handleBookingTypeSelect(e.target.value)}
                    className="mr-2"
                  />
                  <span className={textColor}>Potential</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="completed"
                    checked={formData.bookingType === 'completed'}
                    onChange={(e) => handleBookingTypeSelect(e.target.value)}
                    className="mr-2"
                  />
                  <span className={textColor}>Completed</span>
                </label>
              </div>
            </div>

            {/* Document Uploads */}
            <div className={`p-4 rounded-lg border ${sectionBg} ${sectionBorder}`}>
              <h4 className={`text-lg font-medium mb-4 ${textColor}`}>Documents (Optional)</h4>
              <div className="space-y-4">
                <FileUploadZone
                  label="Contract (PDF)"
                  accept="application/pdf"
                  maxSize={5}
                  file={contractFile}
                  preview={null}
                  onFileSelect={handleContractSelect}
                  onFileRemove={clearContract}
                  error={uploadErrors.contract}
                  disabled={loading || submitted}
                  isDarkMode={isDarkMode}
                  helperText="Upload a signed contract in PDF format."
                />

                <FileUploadZone
                  label="Payment Receipt (Image)"
                  accept="image/*"
                  maxSize={3}
                  file={receiptFile}
                  preview={receiptPreview}
                  onFileSelect={handleReceiptSelect}
                  onFileRemove={clearReceipt}
                  error={uploadErrors.receipt}
                  disabled={loading || submitted}
                  isDarkMode={isDarkMode}
                  helperText="Upload a receipt image (JPG or PNG)."
                />

                <p className={`text-xs ${secondaryTextColor}`}>
                  Contracts and payment receipts are optional. You can add or replace them later from the booking details.
                </p>
              </div>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className={`p-3 rounded border ${isDarkMode ? 'bg-red-900/30 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {errors.submit}
              </div>
            )}

            {submissionWarnings.length > 0 && (
              <div className={`p-3 rounded border flex gap-3 items-start ${isDarkMode ? 'bg-amber-900/30 border-amber-700 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                <div className="space-y-1 text-sm">
                  {submissionWarnings.map((warning, index) => (
                    <p key={`warning-${index}`}>{warning}</p>
                  ))}
                  <p className="text-xs opacity-80">The booking was created successfully. You can retry uploads from the booking details panel.</p>
                </div>
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
              disabled={loading || submitted}
              className={`flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition`}
            >
              {loading ? 'Creating...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBookingModal;
