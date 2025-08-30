// src/components/ConflictResolutionModal.jsx
import React, { useState } from 'react';
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-red-50 border-b border-red-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-900">
                  Pending Booking Conflict Detected
                </h3>
                <p className="text-red-700 text-sm">
                  This camera unit has conflicting pending bookings for overlapping dates
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-red-500 hover:text-red-700 p-1"
              disabled={loading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Current Rental Info */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Rental to Confirm:</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Camera className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">
                      {rental.cameras?.name} {rental.cameras?.serial_number && `(#${rental.cameras.serial_number})`}
                    </p>
                    <p className="text-blue-700 text-sm">
                      Customer: {getCustomerName(rental)}
                    </p>
                  </div>
                </div>
                <div className="text-right text-blue-700 text-sm">
                  <p>{formatDate(rental.start_date)} - {formatDate(rental.end_date)}</p>
                  <p className="font-medium">₱{parseFloat(rental.total_price).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Conflicting Rentals */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Conflicting Rentals:</h4>
            
            {/* Confirmed Conflicts Warning */}
            {hasConfirmedConflicts && (
              <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="font-semibold text-red-900 mb-1">⚠️ Confirmed Booking Conflicts Detected</h5>
                    <p className="text-red-800 text-sm">
                      There are already confirmed bookings for this camera unit during the same period. 
                      These bookings cannot be automatically cancelled. You must either:
                    </p>
                    <ul className="text-red-800 text-sm mt-2 ml-4 list-disc">
                      <li>Transfer the new booking to a different unit of the same model</li>
                      <li>Manually resolve the conflict with confirmed customers</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              {/* Show confirmed conflicts first */}
              {confirmedConflicts.map((conflict) => (
                <div key={conflict.id} className="bg-red-50 border border-red-300 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Users className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-900">
                          {getCustomerName(conflict)}
                        </p>
                        <p className="text-red-700 text-sm font-semibold">
                          Status: {conflict.rental_status.toUpperCase()} ⚠️
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-red-700 text-sm">
                      <p className="font-medium">{formatDate(conflict.start_date)} - {formatDate(conflict.end_date)}</p>
                      <p className="text-xs">ID: {conflict.id.slice(0, 8)}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Show pending conflicts */}
              {pendingConflicts.map((conflict) => (
                <div key={conflict.id} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Users className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-medium text-orange-900">
                          {getCustomerName(conflict)}
                        </p>
                        <p className="text-orange-700 text-sm">
                          Status: {conflict.rental_status}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-orange-700 text-sm">
                      <p>{formatDate(conflict.start_date)} - {formatDate(conflict.end_date)}</p>
                      <p className="text-xs">ID: {conflict.id.slice(0, 8)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution Options */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-4">Resolution Options:</h4>
            
            <div className="space-y-4">
              {/* Option 1: Transfer current rental to available unit */}
              {availableUnits.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="resolution"
                      value="transfer_current"
                      checked={selectedAction === 'transfer_current'}
                      onChange={(e) => setSelectedAction(e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        Transfer current rental to available unit
                      </p>
                      <p className="text-gray-600 text-sm mb-3">
                        Move the rental you're trying to confirm to a different unit of the same model
                      </p>
                      
                      {selectedAction === 'transfer_current' && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Select available unit:</p>
                          {availableUnits.map((unit) => (
                            <label key={unit.id} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="radio"
                                name="available_unit"
                                value={unit.id}
                                checked={selectedUnitId === unit.id}
                                onChange={(e) => setSelectedUnitId(e.target.value)}
                                className="text-blue-600"
                              />
                              <span className="text-sm text-gray-800">
                                {unit.name} {unit.serial_number && `(Serial: #${unit.serial_number})`}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              )}

              {/* Option 2: Reject current rental (when no transfer option available) */}
              {availableUnits.length === 0 && (
                <div className="border border-red-200 rounded-lg p-4">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="resolution"
                      value="reject_current"
                      checked={selectedAction === 'reject_current'}
                      onChange={(e) => setSelectedAction(e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        Reject current rental application
                      </p>
                      <p className="text-gray-600 text-sm mb-3">
                        Reject this rental application since there are conflicts and no available units to transfer to
                      </p>
                      
                      {selectedAction === 'reject_current' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Rejection reason (will be sent to customer):
                          </label>
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g., Camera unit is not available for the requested dates due to confirmed bookings. Please select different dates and submit a new booking request."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
                            rows={3}
                          />
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              )}

              {/* Option 3: Reject conflicting pending bookings (only if there are pending conflicts) */}
              {pendingConflicts.length > 0 && (
                <div className="border border-orange-200 rounded-lg p-4">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="resolution"
                      value="reject_conflicts"
                      checked={selectedAction === 'reject_conflicts'}
                      onChange={(e) => setSelectedAction(e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        Reject conflicting pending bookings
                      </p>
                      <p className="text-gray-600 text-sm mb-3">
                        Automatically reject pending bookings that conflict with this one and send feedback to customers
                      </p>
                      
                      {selectedAction === 'reject_conflicts' && (
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Pending bookings to be rejected ({pendingConflicts.length}):
                            </p>
                            <div className="bg-orange-50 rounded p-3 space-y-1">
                              {pendingConflicts.map((conflict) => (
                                <div key={conflict.id} className="text-sm text-orange-800">
                                  • {getCustomerName(conflict)} - {formatDate(conflict.start_date)} to {formatDate(conflict.end_date)}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Rejection reason (will be sent to customers):
                            </label>
                            <textarea
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="e.g., Camera unit no longer available for the requested dates. Please check available dates and submit a new booking request."
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
                              rows={3}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              )}

              {/* Final Option: Confirm anyway (dangerous) */}
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="resolution"
                    value="confirm_anyway"
                    checked={selectedAction === 'confirm_anyway'}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-red-900">
                      Confirm anyway (Override conflicts)
                    </p>
                    <p className="text-red-700 text-sm">
                      ⚠️ This will create double bookings for the same camera unit. 
                      {hasConfirmedConflicts 
                        ? " You will need to manually resolve conflicts with confirmed customers." 
                        : " Only use if you plan to manually resolve this later."}
                    </p>
                    {hasConfirmedConflicts && (
                      <p className="text-red-800 text-xs mt-1 font-medium">
                        Warning: This will conflict with {confirmedConflicts.length} confirmed booking(s)!
                      </p>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirmDisabled()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>
                  {selectedAction === 'transfer_current' ? 'Transfer & Confirm' :
                   selectedAction === 'reject_current' ? 'Reject Application' :
                   selectedAction === 'reject_conflicts' ? 'Reject Conflicts & Confirm' :
                   'Confirm Anyway'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictResolutionModal;
