import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Camera, Calendar, User, Phone, Mail, DollarSign, AlertTriangle } from 'lucide-react';
import DateFilterInput from '@components/user/forms/DateFilterInput';
import { createQuickBooking, calculateQuickBookingPrice } from '@services/bookingService';
import FileUploadZone from './FileUploadZone';
import useBackHandler from '@hooks/useBackHandler';

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

  // Handle mobile back button - close modal when back is pressed
  useBackHandler(open, () => {
    if (!loading) {
      onClose();
    }
  }, 100);

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

  const calculatePricing = useCallback(async () => {
    if (!formData.cameraId || !formData.startDate || !formData.endDate) {
      setPricing(null);
      return;
    }

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
  }, [formData.cameraId, formData.startDate, formData.endDate]);

  useEffect(() => {
    if (formData.cameraId && formData.startDate && formData.endDate) {
      calculatePricing();
    } else {
      setPricing(null);
    }
  }, [formData.cameraId, formData.startDate, formData.endDate, calculatePricing]);

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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.cameraId) newErrors.cameraId = 'Camera is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (!formData.customerName.trim()) newErrors.customerName = 'Customer name is required';
    if (!formData.customerContact.trim()) newErrors.customerContact = 'Contact is required';

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

  const themeClasses = useMemo(() => ({
    bgColor: isDarkMode ? 'bg-gray-900' : 'bg-white',
    borderColor: isDarkMode ? 'border-gray-700' : 'border-slate-200',
    textColor: isDarkMode ? 'text-gray-100' : 'text-slate-800',
    secondaryTextColor: isDarkMode ? 'text-gray-400' : 'text-slate-600',
    inputBg: isDarkMode ? 'bg-gray-800' : 'bg-white',
    inputBorder: isDarkMode ? 'border-gray-600' : 'border-slate-300',
    inputText: isDarkMode ? 'text-gray-100' : 'text-slate-900',
    labelColor: isDarkMode ? 'text-gray-300' : 'text-slate-700',
    errorColor: isDarkMode ? 'text-red-400' : 'text-red-600',
    sectionBg: isDarkMode ? 'bg-gray-800' : 'bg-slate-50',
    sectionBorder: isDarkMode ? 'border-gray-600' : 'border-slate-200'
  }), [isDarkMode]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      
      <div className={`relative rounded-lg shadow-xl w-full max-w-2xl mx-4 border ${themeClasses.bgColor} ${themeClasses.borderColor}`}>
        <div className={`px-6 py-4 border-b flex items-center justify-between ${themeClasses.borderColor}`}>
          <h3 className={`text-lg font-semibold ${themeClasses.textColor}`}>Create New Booking</h3>
          <button onClick={onClose} className={`text-gray-400 hover:text-gray-600`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${themeClasses.labelColor}`}>
                <Camera className="w-4 h-4 inline mr-2" />
                Camera
              </label>
              <select
                value={formData.cameraId}
                onChange={(e) => handleInputChange('cameraId', e.target.value)}
                className={`w-full p-3 border rounded-lg ${themeClasses.inputBg} ${themeClasses.inputBorder} ${themeClasses.inputText} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">Select a camera</option>
                {cameras.map(camera => (
                  <option key={camera.id} value={camera.id}>
                    {camera.name}
                    {camera.serial_number && ` (#${camera.serial_number})`}
                  </option>
                ))}
              </select>
              {errors.cameraId && <p className={`text-sm mt-1 ${themeClasses.errorColor}`}>{errors.cameraId}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${themeClasses.labelColor}`}>
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
              {errors.startDate && <p className={`text-sm mt-1 ${themeClasses.errorColor}`}>{errors.startDate}</p>}
              {errors.endDate && <p className={`text-sm mt-1 ${themeClasses.errorColor}`}>{errors.endDate}</p>}
            </div>

            {pricing && (
              <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className={`w-4 h-4 ${themeClasses.secondaryTextColor}`} />
                  <span className={`font-medium ${themeClasses.textColor}`}>Pricing Details</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className={themeClasses.secondaryTextColor}>Duration</span>
                    <p className={`font-medium ${themeClasses.textColor}`}>{pricing.rentalDays} days</p>
                  </div>
                  <div>
                    <span className={themeClasses.secondaryTextColor}>Rate</span>
                    <p className={`font-medium ${themeClasses.textColor}`}>₱{pricing.pricePerDay}/day</p>
                  </div>
                  <div>
                    <span className={themeClasses.secondaryTextColor}>Total</span>
                    <p className={`font-medium text-lg ${themeClasses.textColor}`}>₱{pricing.totalPrice.toFixed(2)}</p>
                  </div>
                </div>
                {pricing.tierDescription && (
                  <p className={`text-xs mt-2 ${themeClasses.secondaryTextColor}`}>
                    Tier: {pricing.tierDescription}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-4">
              <h4 className={`text-lg font-medium ${themeClasses.textColor}`}>Customer Information</h4>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${themeClasses.labelColor}`}>
                  <User className="w-4 h-4 inline mr-2" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  className={`w-full p-3 border rounded-lg ${themeClasses.inputBg} ${themeClasses.inputBorder} ${themeClasses.inputText} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Enter customer's full name"
                />
                {errors.customerName && <p className={`text-sm mt-1 ${themeClasses.errorColor}`}>{errors.customerName}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${themeClasses.labelColor}`}>
                  <Phone className="w-4 h-4 inline mr-2" />
                  Contact Number
                </label>
                <input
                  type="text"
                  value={formData.customerContact}
                  onChange={(e) => handleInputChange('customerContact', e.target.value)}
                  className={`w-full p-3 border rounded-lg ${themeClasses.inputBg} ${themeClasses.inputBorder} ${themeClasses.inputText} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Phone number or Instagram handle"
                />
                {errors.customerContact && <p className={`text-sm mt-1 ${themeClasses.errorColor}`}>{errors.customerContact}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${themeClasses.labelColor}`}>
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                  className={`w-full p-3 border rounded-lg ${themeClasses.inputBg} ${themeClasses.inputBorder} ${themeClasses.inputText} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="customer@example.com"
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${themeClasses.labelColor}`}>
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
                  <span className={themeClasses.textColor}>Confirmed</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="potential"
                    checked={formData.bookingType === 'potential'}
                    onChange={(e) => handleBookingTypeSelect(e.target.value)}
                    className="mr-2"
                  />
                  <span className={themeClasses.textColor}>Potential</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="completed"
                    checked={formData.bookingType === 'completed'}
                    onChange={(e) => handleBookingTypeSelect(e.target.value)}
                    className="mr-2"
                  />
                  <span className={themeClasses.textColor}>Completed</span>
                </label>
              </div>
            </div>

            <div className={`p-4 rounded-lg border ${themeClasses.sectionBg} ${themeClasses.sectionBorder}`}>
              <h4 className={`text-lg font-medium mb-4 ${themeClasses.textColor}`}>Documents (Optional)</h4>
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

                <p className={`text-xs ${themeClasses.secondaryTextColor}`}>
                  Contracts and payment receipts are optional. You can add or replace them later from the booking details.
                </p>
              </div>
            </div>

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