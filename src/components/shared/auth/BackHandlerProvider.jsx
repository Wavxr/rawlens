/**
 * BackHandlerProvider
 * 
 * Global context provider that manages back button handlers across the application.
 * It maintains a priority-sorted stack of handlers and intercepts browser back navigation
 * to execute the highest-priority active handler.
 * 
 * This enables:
 * - Modal components to close on mobile back button press
 * - Nested modals to close in correct order (last opened, first closed)
 * - Custom back behavior without affecting normal navigation
 * 
 * The provider uses browser history state manipulation to detect back gestures
 * and CustomEvents for handler registration/unregistration.
 */

import { useEffect, useRef, useState } from 'react';
import { BackHandlerContext } from '@hooks/useBackHandlerContext';

export const BackHandlerProvider = ({ children }) => {
  const handlersRef = useRef(new Map());
  const [handlerCount, setHandlerCount] = useState(0);
  const historyStateRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Initialize history state on mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // Set up initial history state
    const currentState = window.history.state || {};
    historyStateRef.current = { backHandlerMarker: true };
    
    // Replace current state without adding to history
    window.history.replaceState(
      { ...currentState, backHandlerMarker: true },
      ''
    );
  }, []);

  // Listen for popstate events (back/forward navigation)
  useEffect(() => {
    const handlePopState = (event) => {
      // Check if we have any active handlers
      if (handlersRef.current.size === 0) {
        return;
      }

      // Prevent default back navigation
      event.preventDefault();

      // Sort handlers by priority (highest first)
      const sortedHandlers = Array.from(handlersRef.current.entries())
        .sort(([, a], [, b]) => b.priority - a.priority);

      // Execute the highest priority handler
      if (sortedHandlers.length > 0) {
        const [, handler] = sortedHandlers[0];
        try {
          handler.callback();
          
          // Push a new state to maintain history position
          // This prevents the browser from navigating away
          window.history.pushState({ backHandlerMarker: true }, '');
        } catch {
          // Still push state to prevent navigation
          window.history.pushState({ backHandlerMarker: true }, '');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Listen for handler registration
  useEffect(() => {
    const handleRegister = (event) => {
      const { id, priority, callback } = event.detail;
      
      handlersRef.current.set(id, { priority, callback });
      setHandlerCount(handlersRef.current.size);

      // Push a history state when first handler is added
      if (handlersRef.current.size === 1) {
        window.history.pushState({ backHandlerMarker: true }, '');
      }
    };

    const handleUnregister = (event) => {
      const { id } = event.detail;
      
      const existed = handlersRef.current.delete(id);
      if (existed) {
        setHandlerCount(handlersRef.current.size);

        // Pop history state when last handler is removed
        if (handlersRef.current.size === 0) {
          // Go back to remove the marker state we added
          if (window.history.state?.backHandlerMarker) {
            window.history.back();
          }
        }
      }
    };

    window.addEventListener('registerBackHandler', handleRegister);
    window.addEventListener('unregisterBackHandler', handleUnregister);

    return () => {
      window.removeEventListener('registerBackHandler', handleRegister);
      window.removeEventListener('unregisterBackHandler', handleUnregister);
    };
  }, []);

  const contextValue = {
    activeHandlersCount: handlerCount
  };

  return (
    <BackHandlerContext.Provider value={contextValue}>
      {children}
    </BackHandlerContext.Provider>
  );
};

export default BackHandlerProvider;
