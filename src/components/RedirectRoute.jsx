// src/components/RedirectRoute.jsx
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

export default function RedirectRoute() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (user?.role === 'admin') return <Navigate to="/admin" />;
  if (user?.role === 'user') return <Navigate to="/user" />;

  return <Navigate to="/login" />;
}