import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import { useEffect } from 'react';
import { ensureSubscribed } from '../services/pushService';


const ProtectedRoute = ({ requiredRole }) => {
  const { session, role, loading, roleLoading } = useAuthStore();

  useEffect(() => {
    // The initialize function is now called once when the auth store is created.
    // We don't need to call it here anymore.
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (userId) {
      ensureSubscribed(userId);
    }
  }, [session?.user?.id]);

  if (loading || roleLoading) return <div>Loading... protected</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (requiredRole && role !== requiredRole) return <Navigate to="/" replace />;
  return <Outlet />;
};

export default ProtectedRoute;
