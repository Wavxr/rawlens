import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import { useEffect } from 'react';

const ProtectedRoute = ({ requiredRole }) => {
  const { session, role, loading, roleLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize(); // run once on mount to fetch session + role
  }, []);

  if (loading || roleLoading) return <div>Loading...</div>;

  if (!session) return <Navigate to="/login" replace />;

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
