import React from 'react';
import { FileText, CheckCircle, Package, Truck, Home, Activity, Clock, ArrowLeftRight, Trophy } from 'lucide-react';

const STEPS = [
  { key: 'pending', label: 'Application', Icon: FileText },
  { key: 'confirmed', label: 'Confirmed', Icon: CheckCircle },
  { key: 'ready_to_ship', label: 'Ready', Icon: Package },
  { key: 'in_transit_to_user', label: 'To User', Icon: Truck },
  { key: 'delivered', label: 'Delivered', Icon: Home },
  { key: 'active', label: 'Active', Icon: Activity },
  { key: 'return_scheduled', label: 'Return', Icon: Clock },
  { key: 'in_transit_to_owner', label: 'To Owner', Icon: ArrowLeftRight },
  { key: 'returned', label: 'Returned', Icon: CheckCircle },
  { key: 'completed', label: 'Completed', Icon: Trophy },
];

function computeCurrentStepKey(rental) {
  const rentalStatus = rental?.rental_status;
  const shippingStatus = rental?.shipping_status;

  if (rentalStatus === 'completed' || shippingStatus === 'returned') return 'completed';
  if (shippingStatus === 'in_transit_to_owner') return 'in_transit_to_owner';
  if (shippingStatus === 'return_scheduled') return 'return_scheduled';
  if (rentalStatus === 'active') return 'active';
  if (shippingStatus === 'delivered') return 'delivered';
  if (shippingStatus === 'in_transit_to_user') return 'in_transit_to_user';
  if (shippingStatus === 'ready_to_ship') return 'ready_to_ship';
  if (rentalStatus === 'confirmed') return 'confirmed';
  if (rentalStatus === 'pending') return 'pending';
  return 'pending';
}

function getCurrentStepIndex(rental) {
  const key = computeCurrentStepKey(rental);
  const idx = STEPS.findIndex((s) => s.key === key);
  return idx >= 0 ? idx : 0;
}

function getNextStepLabel(idx) {
  const next = STEPS[idx + 1];
  return next ? next.label : null;
}

export default function RentalStepper({ rental }) {
  const idx = getCurrentStepIndex(rental);
  const nextLabel = getNextStepLabel(idx);
  
  return (
    <div className="bg-gray-700 rounded-xl border border-gray-600 p-6 shadow-sm">
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Rental Progress</h3>
          <p className="text-sm text-gray-300 mt-1">Track your rental from start to finish</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-white">{STEPS[idx]?.label}</div>
          <div className="text-xs text-gray-400">Step {idx + 1} of {STEPS.length}</div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="relative">
        <div className="flex items-center justify-between mb-8 overflow-x-auto">
          {STEPS.map((step, i) => {
            const Icon = step.Icon;
            const isDone = i < idx;
            const isCurrent = i === idx;
            const isUpcoming = i > idx;

            return (
              <div key={step.key} className="flex flex-col items-center relative flex-shrink-0">
                {/* Step Circle */}
                <div
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 z-10
                    ${isDone 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                      : isCurrent 
                      ? 'bg-blue-900/50 border-blue-500 text-blue-400 shadow-md' 
                      : 'bg-gray-600 border-gray-500 text-gray-400'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                </div>
                
                {/* Step Label */}
                <div className="mt-3 text-center">
                  <div className={`text-xs font-medium ${isCurrent ? 'text-blue-400' : isDone ? 'text-white' : 'text-gray-400'}`}>
                    {step.label}
                  </div>
                </div>
                
                {/* Connector Line */}
                {i < STEPS.length - 1 && (
                  <div 
                    className={`
                      absolute top-5 left-full w-8 h-0.5 -translate-y-0.5 transition-colors duration-300
                      ${isDone ? 'bg-blue-600' : 'bg-gray-500'}
                    `}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Status */}
      <div className="bg-gray-600 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-sm font-medium text-white">Current:</span>
              <span className="text-sm text-gray-200">{STEPS[idx]?.label}</span>
            </div>
          </div>
          
          {nextLabel && (
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <span>Next:</span>
              <span className="font-medium text-white">{nextLabel}</span>
              <ArrowLeftRight className="h-4 w-4 text-gray-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
