// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RedirectRoute from './components/auth/RedirectRoute';
import AuthErrorBoundary from './components/auth/AuthErrorBoundary';
import useThemeStore from './stores/useThemeStore';
import NotificationToastManager from './components/notifications/NotificationToastManager';

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
import AdminBookings from './pages/admin/Bookings';
import AdminRentals from './pages/admin/Rental';
import AdminDelivery from './pages/admin/Delivery';
import AdminFeedbacks from './pages/admin/Feedbacks';
import Settings from './pages/admin/Settings';

// User
import UserDashboard from './pages/user/UserDashboard';
import Home from './pages/user/Home';
import Search from './pages/user/Search';
import Cart from './pages/user/Cart';
import Booking from './pages/user/Booking';
import Rental from './pages/user/Rental';
import UserEducational from './pages/user/Educational';
import UserProfile from './pages/user/Profile';

function App() {
  const { theme } = useThemeStore();

  // Apply theme class to the root element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className="App">
      <AuthErrorBoundary>
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
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="rentals" element={<AdminRentals />} />
              <Route path="delivery" element={<AdminDelivery />} />
              <Route path="feedbacks" element={<AdminFeedbacks />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>

          {/* User Routes (only accessible to logged-in user) */}
          <Route element={<ProtectedRoute requiredRole="user" />}>
            <Route path="/user" element={<UserDashboard />}>
              <Route index element={<Home />} />
              <Route path="home" element={<Home />} />
              <Route path="search" element={<Search />} />
              <Route path="cart" element={<Cart />} />
              <Route path="booking" element={<Booking />} />
              <Route path="educational" element={<UserEducational />} />
              <Route path="profile" element={<UserProfile />} />
            </Route>
            {/* Rental page outside UserDashboard navigation */}
            <Route path="/user/rental" element={<Rental />} />
          </Route>

          {/* Catch-all for 404 Not Found */}
          <Route path="*" element={<NotFound />} />

        </Routes>

        {/* Add the toast manager */}
        <NotificationToastManager />
      </AuthErrorBoundary>
    </div>
  );
}

export default App;
