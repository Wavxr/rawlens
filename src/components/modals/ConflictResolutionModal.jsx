// src/components/ConflictResolutionModal.jsx
import { useState } from 'react';
import { X, AlertTriangle, Camera, Users, Calendar, ArrowRight, Loader2 } from 'lucide-react';

const ConflictResolutionModal = ({
  isOpen,
  onClose,
  rental,
  conflicts,
  availableUnits,
  onConfirmWithCurrentUnit,
  onTransferToUnit,
  onRejectConflicts, // New prop for rejecting conflicts
  loading
}) => {
  const [selectedAction, setSelectedAction] = useState(() => {
    // Default to transfer if units are available, otherwise reject current
    return availableUnits && availableUnits.length > 0 ? 'transfer_current' : 'reject_current';
  }); // 'transfer_current', 'reject_current', 'reject_conflicts', 'confirm_anyway'
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  if (!isOpen || !rental) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getCustomerName = (rental) => {
    return rental.customer_name || 
           (rental.users ? `${rental.users.first_name} ${rental.users.last_name}`.trim() : '') ||
           'Unknown Customer';
  };

  // Separate conflicts by status
  const confirmedConflicts = conflicts.filter(c => c.rental_status === 'confirmed');
  const pendingConflicts = conflicts.filter(c => c.rental_status === 'pending');
  const hasConfirmedConflicts = confirmedConflicts.length > 0;

  const handleConfirm = async () => {
    if (selectedAction === 'confirm_anyway') {
      onConfirmWithCurrentUnit(rental.id);
    } else if (selectedAction === 'transfer_current' && selectedUnitId) {
      onTransferToUnit(rental.id, selectedUnitId);
    } else if (selectedAction === 'reject_current' && rejectionReason.trim()) {
      onRejectConflicts([rental.id], rejectionReason);
    } else if (selectedAction === 'reject_conflicts' && rejectionReason.trim()) {
      onRejectConflicts(pendingConflicts.map(c => c.id), rejectionReason);
    }
  };

  const isConfirmDisabled = () => {
    if (loading) return true;
    if (selectedAction === 'transfer_current' && !selectedUnitId) return true;
    if ((selectedAction === 'reject_conflicts' || selectedAction === 'reject_current') && !rejectionReason.trim()) return true;
    return false;
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-red-50 border-b border-red-200 p-3 sm:p-4 flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="bg-red-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-red-900 truncate">
                  Booking Conflict
                </h3>
                <p className="text-xs text-red-700 truncate">
                  Unit #{rental.cameras?.serial_number || 'N/A'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
              disabled={loading}
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-4 overflow-y-auto flex-1">
          {/* Current Rental Info */}
          <div className="mb-3 sm:mb-4">
            <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2">To Confirm:</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <Camera className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-blue-900 text-xs sm:text-sm truncate">
                      {rental.cameras?.name}
                    </p>
                    <p className="text-blue-700 text-[10px] sm:text-xs truncate">
                      {getCustomerName(rental)}
                    </p>
                  </div>
                </div>
                <div className="text-right text-blue-700 text-[10px] sm:text-xs flex-shrink-0">
                  <p className="font-medium">₱{parseFloat(rental.total_price).toFixed(2)}</p>
                  <p className="whitespace-nowrap">{formatDate(rental.start_date)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Conflicting Rentals */}
          <div className="mb-3 sm:mb-4">
            <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2">Conflicts:</h4>
            
            {/* Confirmed Conflicts Warning */}
            {hasConfirmedConflicts && (
              <div className="bg-red-100 border border-red-300 rounded-lg p-2 sm:p-3 mb-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-red-900 text-xs sm:text-sm mb-1">Confirmed Bookings</h5>
                    <p className="text-red-800 text-[10px] sm:text-xs">
                      There are confirmed bookings. Transfer to another unit or handle manually.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-1.5 sm:space-y-2">
              {/* Confirmed conflicts */}
              {confirmedConflicts.map((conflict) => (
                <div key={conflict.id} className="bg-red-50 border border-red-300 rounded-lg p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-red-900 text-xs truncate">
                          {getCustomerName(conflict)}
                        </p>
                        <p className="text-red-700 text-[10px] font-semibold">CONFIRMED</p>
                      </div>
                    </div>
                    <div className="text-right text-red-700 text-[10px] flex-shrink-0">
                      <p className="whitespace-nowrap">{formatDate(conflict.start_date)}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Pending conflicts */}
              {pendingConflicts.map((conflict) => (
                <div key={conflict.id} className="bg-orange-50 border border-orange-200 rounded-lg p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-orange-900 text-xs truncate">
                          {getCustomerName(conflict)}
                        </p>
                        <p className="text-orange-700 text-[10px]">pending</p>
                      </div>
                    </div>
                    <div className="text-right text-orange-700 text-[10px] flex-shrink-0">
                      <p className="whitespace-nowrap">{formatDate(conflict.start_date)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution Options */}
          <div className="mb-3 sm:mb-4">
            <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2">Resolution:</h4>
            
            <div className="space-y-2">
              {/* Option 1: Transfer current rental */}
              {availableUnits.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-2 sm:p-3">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="resolution"
                      value="transfer_current"
                      checked={selectedAction === 'transfer_current'}
                      onChange={(e) => setSelectedAction(e.target.value)}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-xs sm:text-sm">
                        Transfer to available unit
                      </p>
                      
                      {selectedAction === 'transfer_current' && (
                        <div className="space-y-1.5 mt-2">
                          {availableUnits.map((unit) => (
                            <label key={unit.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="available_unit"
                                value={unit.id}
                                checked={selectedUnitId === unit.id}
                                onChange={(e) => setSelectedUnitId(e.target.value)}
                                className="flex-shrink-0"
                              />
                              <span className="text-xs text-gray-800 truncate">
                                {unit.name} #{unit.serial_number}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              )}

              {/* Option 2: Reject current */}
              {availableUnits.length === 0 && (
                <div className="border border-red-200 rounded-lg p-2 sm:p-3">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="resolution"
                      value="reject_current"
                      checked={selectedAction === 'reject_current'}
                      onChange={(e) => setSelectedAction(e.target.value)}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-xs sm:text-sm">
                        Reject this application
                      </p>
                      
                      {selectedAction === 'reject_current' && (
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Reason for rejection..."
                          className="w-full px-2 py-1.5 mt-2 border border-gray-300 rounded-md text-xs resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={2}
                        />
                      )}
                    </div>
                  </label>
                </div>
              )}

              {/* Option 3: Reject conflicts */}
              {pendingConflicts.length > 0 && (
                <div className="border border-orange-200 rounded-lg p-2 sm:p-3">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="resolution"
                      value="reject_conflicts"
                      checked={selectedAction === 'reject_conflicts'}
                      onChange={(e) => setSelectedAction(e.target.value)}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-xs sm:text-sm">
                        Reject {pendingConflicts.length} pending conflict{pendingConflicts.length > 1 ? 's' : ''}
                      </p>
                      
                      {selectedAction === 'reject_conflicts' && (
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Reason sent to customers..."
                          className="w-full px-2 py-1.5 mt-2 border border-gray-300 rounded-md text-xs resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={2}
                        />
                      )}
                    </div>
                  </label>
                </div>
              )}

              {/* Option 4: Confirm anyway */}
              <div className="border border-red-200 rounded-lg p-2 sm:p-3 bg-red-50">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="resolution"
                    value="confirm_anyway"
                    checked={selectedAction === 'confirm_anyway'}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-red-900 text-xs sm:text-sm">
                      ⚠️ Confirm anyway
                    </p>
                    <p className="text-red-700 text-[10px] sm:text-xs mt-0.5">
                      Creates double bookings. Handle manually.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 flex gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 text-xs sm:text-sm font-medium transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirmDisabled()}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>
                  {selectedAction === 'transfer_current' ? 'Transfer' :
                   selectedAction === 'reject_current' ? 'Reject' :
                   selectedAction === 'reject_conflicts' ? 'Reject & Confirm' :
                   'Confirm'}
                </span>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictResolutionModal;
