import { useCallback, useState } from "react";

// Tracks per-rental async button states and ensures cleanup after each call.
export function useActionLoadingMap() {
  const [actionLoading, setActionLoading] = useState({});

  const runWithLoading = useCallback(async (rentalId, actionKey, actionFn) => {
    setActionLoading((prev) => ({ ...prev, [rentalId]: actionKey }));
    try {
      return await actionFn();
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[rentalId];
        return next;
      });
    }
  }, []);

  return { actionLoading, runWithLoading };
}
