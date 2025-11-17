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
    <div className="bg-gray-700 rounded-lg border border-gray-600 p-3 md:p-4 shadow-sm">
      {/* Progress Header - Compact for Mobile */}
      <div className="flex items-start justify-between mb-3 md:mb-4 gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm md:text-base font-semibold text-white truncate">Rental Progress</h3>
          <p className="text-xs text-gray-400 hidden sm:block">Track rental journey</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs md:text-sm font-medium text-white">{STEPS[idx]?.label}</div>
          <div className="text-xs text-gray-400">{idx + 1}/{STEPS.length}</div>
        </div>
      </div>

      {/* Progress Steps - Horizontal Scroll on Mobile */}
      <div className="relative mb-3 md:mb-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {STEPS.map((step, i) => {
            const Icon = step.Icon;
            const isDone = i < idx;
            const isCurrent = i === idx;

            return (
              <div key={step.key} className="flex flex-col items-center relative flex-shrink-0 min-w-[50px] md:min-w-[60px]">
                {/* Step Circle - Smaller on Mobile */}
                <div
                  className={`
                    flex items-center justify-center w-7 h-7 md:w-9 md:h-9 rounded-full border-2 transition-all z-10
                    ${isDone 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : isCurrent 
                      ? 'bg-blue-900/50 border-blue-500 text-blue-400 ring-2 ring-blue-500/30' 
                      : 'bg-gray-600 border-gray-500 text-gray-400'
                    }
                  `}
                >
                  <Icon className="h-3 w-3 md:h-4 md:w-4" />
                </div>
                
                {/* Step Label - Smaller on Mobile */}
                <div className="mt-1 text-center w-full">
                  <div className={`text-[10px] md:text-xs font-medium truncate px-1 ${isCurrent ? 'text-blue-400' : isDone ? 'text-white' : 'text-gray-400'}`}>
                    {step.label}
                  </div>
                </div>
                
                {/* Connector Line - Thinner on Mobile */}
                {i < STEPS.length - 1 && (
                  <div 
                    className={`
                      absolute top-3.5 md:top-4.5 left-[calc(50%+14px)] md:left-[calc(50%+18px)] w-[calc(100%-28px)] md:w-[calc(100%-36px)] h-0.5 transition-colors
                      ${isDone ? 'bg-blue-600' : 'bg-gray-500'}
                    `}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Status - Compact for Mobile */}
      <div className="bg-gray-600 rounded-lg p-2 md:p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
            <span className="text-xs md:text-sm font-medium text-white">
              {STEPS[idx]?.label}
            </span>
          </div>
          
          {nextLabel && (
            <div className="flex items-center gap-1.5 text-xs md:text-sm text-gray-300 ml-3.5 sm:ml-0">
              <span className="text-gray-400">Next:</span>
              <span className="font-medium text-white">{nextLabel}</span>
              <ArrowLeftRight className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
