/**
 * useBackHandler Hook
 * 
 * Handles native mobile back button (Android/iOS) by managing browser history state.
 * This hook allows components (especially modals) to intercept the back gesture
 * and execute custom logic before navigation occurs.
 * 
 * Usage:
 * useBackHandler(isActive, callback, priority)
 * 
 * @param {boolean} isActive - Whether the handler should be active
 * @param {function} callback - Function to call when back is pressed
 * @param {number} priority - Priority level (higher = executed first). Default: 0
 * 
 * Example:
 * const [isOpen, setIsOpen] = useState(false);
 * useBackHandler(isOpen, () => setIsOpen(false), 100);
 */

import { useEffect, useRef } from 'react';

const useBackHandler = (isActive, callback, priority = 0) => {
  const callbackRef = useRef(callback);
  const priorityRef = useRef(priority);
  const handlerIdRef = useRef(null);

  // Keep callback reference updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Keep priority reference updated
  useEffect(() => {
    priorityRef.current = priority;
  }, [priority]);

  useEffect(() => {
    if (!isActive) {
      // If not active, clean up any existing handler
      if (handlerIdRef.current) {
        window.dispatchEvent(new CustomEvent('unregisterBackHandler', {
          detail: { id: handlerIdRef.current }
        }));
        handlerIdRef.current = null;
      }
      return;
    }

    // Generate unique handler ID
    const handlerId = `back-handler-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    handlerIdRef.current = handlerId;

    // Register this handler with the global manager
    window.dispatchEvent(new CustomEvent('registerBackHandler', {
      detail: {
        id: handlerId,
        priority: priorityRef.current,
        callback: () => {
          if (callbackRef.current) {
            callbackRef.current();
            return true; // Indicate handler was called
          }
          return false;
        }
      }
    }));

    // Cleanup on unmount or when isActive becomes false
    return () => {
      if (handlerIdRef.current) {
        window.dispatchEvent(new CustomEvent('unregisterBackHandler', {
          detail: { id: handlerIdRef.current }
        }));
        handlerIdRef.current = null;
      }
    };
  }, [isActive]);
};

export default useBackHandler;
