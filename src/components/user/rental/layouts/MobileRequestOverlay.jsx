import { useEffect } from 'react';
import { ArrowLeft, X } from 'lucide-react';

const MobileRequestOverlay = ({ isOpen, onClose, children, title }) => {
  // Prevent body scroll when overlay is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop with fade */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ease-out"
        onClick={onClose}
      />

      {/* Overlay Content with slide animation */}
      <div className="absolute inset-0 transform transition-transform duration-300 ease-out">
        <div className="h-full bg-neutral-50 flex flex-col shadow-2xl">
          {/* Header with Back Button + Scroll Shadow */}
          <div className="bg-white border-b border-neutral-200 px-3 py-3 flex items-center gap-3 shadow-sm flex-shrink-0 sticky top-0 z-10">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-neutral-100 hover:bg-neutral-200 active:scale-95 active:bg-neutral-300 flex items-center justify-center transition-all duration-150"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-900" strokeWidth={2.5} />
            </button>
            {title && (
              <h2 className="text-base font-bold text-neutral-900 truncate flex-1">
                {title}
              </h2>
            )}
          </div>

          {/* Scrollable Content with smooth scrolling */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="p-3 pb-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileRequestOverlay;
