// src/components/RedirectRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from '../stores/useAuthStore';

export default function RedirectRoute() {
  const { session, role, loading, roleLoading, initialize } = useAuthStore();

  useEffect(() => { initialize(); }, []);

  // wait until BOTH the auth state and the role query have finished
  if (loading || roleLoading) return <div>Loading...</div>;

  if (session) {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    /* treat missing/unknown role as a normal user */
    return <Navigate to="/user" replace />;
  }

  // not logged in → let them see login / signup
  return <Outlet />;
}
