import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import { useEffect, useState } from 'react';
import { registerUserPushNotifications, registerAdminPushNotifications, isPushSupported } from '../services/pushService';
import PushMigrationPrompt from './PushMigrationPrompt';

const ProtectedRoute = ({ requiredRole }) => {
  const { session, role, loading, roleLoading, checkSessionValidity, forceCleanup } = useAuthStore();
  const [sessionValid, setSessionValid] = useState(true);

  useEffect(() => {
    const userId = session?.user?.id;
    if (userId && isPushSupported() && role) {
      // Auto-register FCM token if permission is already granted
      if (Notification.permission === 'granted') {
        if (role === 'admin') {
          registerAdminPushNotifications(userId).catch(console.error);
        } else {
          registerUserPushNotifications(userId).catch(console.error);
        }
      }
    }
  }, [session?.user?.id, role]);

  // Periodically check session validity when user interacts with the app
  useEffect(() => {
    if (session?.user?.id && !loading && !roleLoading) {
      const validateSession = async () => {
        const isValid = await checkSessionValidity();
        if (!isValid && sessionValid) {
          console.log('🚨 Session invalidated, cleaning up...');
          setSessionValid(false);
          forceCleanup();
        }
      };

      // Check on mount and when the component becomes visible
      validateSession();

      // Listen for focus events to check session when user returns to tab
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          validateSession();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [session?.user?.id, loading, roleLoading, sessionValid, checkSessionValidity, forceCleanup]);

  if (loading || roleLoading) return <div>Loading... protected</div>;
  if (!session || !sessionValid) return <Navigate to="/login" replace />;
  if (requiredRole && role !== requiredRole) return <Navigate to="/" replace />;
  
  return (
    <>
      <Outlet />
      <PushMigrationPrompt />
    </>
  );
};

export default ProtectedRoute;
