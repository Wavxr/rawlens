// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import RedirectRoute from './components/RedirectRoute';
import useThemeStore from './stores/useThemeStore';
import { useForegroundNotifications } from './hooks/usePushNotifications';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NotFound from './pages/NotFound';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import Dashboard from './pages/admin/Dashboard';
import AdminCameras from './pages/admin/Cameras';
import AdminUsers from './pages/admin/Users';
import AdminInclusions from './pages/admin/Inclusions';
import AdminCalendar from './pages/admin/Calendar';
import AdminRentals from './pages/admin/Rental';
import AdminDelivery from './pages/admin/Delivery';
import AdminFeedbacks from './pages/admin/Feedbacks';
import Settings from './pages/admin/Settings';

// User
import UserDashboard from './pages/user/UserDashboard';
import UserCameras from './pages/user/Cameras';
import UserRent from './pages/user/Rentals';
import UserRequests from './pages/user/Requests';
import UserEducational from './pages/user/Educational';
import UserProfile from './pages/user/Profile';

function App() {
  const { theme } = useThemeStore();

  // Apply theme class to the root element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useForegroundNotifications(); 

  return (
    <Routes>
      {/* Public Page */}
      <Route path="/" element={<Landing />} />

      {/* Redirect logged-in users away from login/signup */}
      <Route element={<RedirectRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>

      {/* Admin Routes (only accessible to logged-in admin) */}
      <Route element={<ProtectedRoute requiredRole="admin" />}>
        <Route path="/admin" element={<AdminDashboard />}>
          <Route index element={<Dashboard />} />
          <Route path="cameras" element={<AdminCameras />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="inclusions" element={<AdminInclusions/>} />
          <Route path="calendar" element={<AdminCalendar />} />
          <Route path="rentals" element={<AdminRentals />} />
          <Route path="delivery" element={<AdminDelivery />} />
          <Route path="feedbacks" element={<AdminFeedbacks />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      {/* User Routes (only accessible to logged-in user) */}
      <Route element={<ProtectedRoute requiredRole="user" />}>
        <Route path="/user" element={<UserDashboard />}>
          <Route index element={<UserCameras />} />
          <Route path="cameras" element={<UserCameras />} />
          <Route path="rentals" element={<UserRent />} />
          <Route path="requests" element={<UserRequests />} />
          <Route path="educational" element={<UserEducational />} />
          <Route path="profile" element={<UserProfile />} />
        </Route>
      </Route>

      {/* Catch-all for 404 Not Found */}
      <Route path="*" element={<NotFound />} />

    </Routes>
  );
}

export default App;
