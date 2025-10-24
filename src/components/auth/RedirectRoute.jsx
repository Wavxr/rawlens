import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import useAuthStore from '../../stores/useAuthStore';
import LoadingScreen from './LoadingScreen';

export default function RedirectRoute() {
  const { session, role, loading, roleLoading, initialize } = useAuthStore();
  
  const hasInitializedRef = useRef(false);
  
  useEffect(() => {
    if (!hasInitializedRef.current) {
      initialize();
      hasInitializedRef.current = true;
    }
  }, [initialize]);

  if (loading || roleLoading) return <LoadingScreen />;

  if (session) {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/user" replace />;
  }

  return <Outlet />;
}