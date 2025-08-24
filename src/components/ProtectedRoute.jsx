import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import { useEffect } from 'react';
import { registerPushForUser, isPushSupported } from '../services/pushService';
import PushMigrationPrompt from './PushMigrationPrompt';

const ProtectedRoute = ({ requiredRole }) => {
  const { session, role, loading, roleLoading } = useAuthStore();

  useEffect(() => {
    const userId = session?.user?.id;
    if (userId && isPushSupported()) {
      // Auto-register FCM token if permission is already granted
      if (Notification.permission === 'granted') {
        registerPushForUser(userId).catch(console.error);
      }
    }
  }, [session?.user?.id]);

  if (loading || roleLoading) return <div>Loading... protected</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (requiredRole && role !== requiredRole) return <Navigate to="/" replace />;
  
  return (
    <>
      <Outlet />
      <PushMigrationPrompt />
    </>
  );
};

export default ProtectedRoute;
