import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore';

class AuthErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Check if this is an auth-related error
    if (error?.message?.includes('session') || 
        error?.message?.includes('auth') || 
        error?.message?.includes('token')) {
      return { hasError: true, error };
    }
    return null;
  }

  componentDidCatch(error, errorInfo) {
    if (this.state.hasError) {
      console.error('Auth Error Boundary caught error:', error, errorInfo);
      
      // Clear auth state and redirect to login
      try {
        useAuthStore.getState().forceCleanup();
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
    }
  }

  render() {
    if (this.state.hasError) {
      // Redirect to login page on auth errors
      return <Navigate to="/login" replace />;
    }

    return this.props.children;
  }
}

export default AuthErrorBoundary;
