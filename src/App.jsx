// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RedirectRoute from './components/auth/RedirectRoute';
import AuthErrorBoundary from './components/auth/AuthErrorBoundary';
import BackHandlerProvider from './components/auth/BackHandlerProvider';
import useThemeStore from './stores/useThemeStore';
import NotificationToastManager from './components/notifications/NotificationToastManager';
import LoadingScreen from './components/auth/LoadingScreen';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NotFound from './pages/NotFound';
import ContractGenerator from './pages/ContractGenerator';

// Admin (lazy-loaded for performance)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminCameras = lazy(() => import('./pages/admin/Cameras'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminInclusions = lazy(() => import('./pages/admin/Inclusions'));
const AdminBookings = lazy(() => import('./pages/admin/Bookings'));
const AdminRentals = lazy(() => import('./pages/admin/Rental'));
const AdminDelivery = lazy(() => import('./pages/admin/Delivery'));
const AdminExtensions = lazy(() => import('./pages/admin/Extensions'));
const AdminPayments = lazy(() => import('./pages/admin/Payments'));
const Settings = lazy(() => import('./pages/admin/Settings'));
// Admin Statistics (individually lazy-loaded to avoid bundling all at once)
const AdminStatsDashboard = lazy(() => import('./pages/admin/Statistics/Dashboard'));
const AdminFeedbacks = lazy(() => import('./pages/admin/Statistics/Feedbacks'));
const BookingTrends = lazy(() => import('./pages/admin/Statistics/BookingTrends'));
const MonthlyHeatmap = lazy(() => import('./pages/admin/Statistics/MonthlyHeatmap'));
const Revenue = lazy(() => import('./pages/admin/Statistics/Revenue'));

// User (lazy-loaded)
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'));
const Home = lazy(() => import('./pages/user/Home'));
const Search = lazy(() => import('./pages/user/Search'));
const Cart = lazy(() => import('./pages/user/Cart'));
const Booking = lazy(() => import('./pages/user/Booking'));
const Rental = lazy(() => import('./pages/user/Rental'));
const UserEducational = lazy(() => import('./pages/user/Educational'));
const UserProfile = lazy(() => import('./pages/user/Profile'));

function App() {
  const { darkMode } = useThemeStore();

  // Apply theme class to the root element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <BackHandlerProvider>
      <div className="App">
        <AuthErrorBoundary>
          <Routes>
            {/* Public Page */}
            <Route path="/" element={<Landing />} />
            <Route path="/contract-generator" element={<ContractGenerator />} />

            {/* Redirect logged-in users away from login/signup */}
            <Route element={<RedirectRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
            </Route>

            {/* Admin Routes (only accessible to logged-in admin) */}
            <Route element={<ProtectedRoute requiredRole="admin" />}>
              <Route
                path="/admin"
                element={
                  <Suspense fallback={<LoadingScreen />}>
                    <AdminDashboard />
                  </Suspense>
                }
              >
                <Route index element={<Suspense fallback={<LoadingScreen />}><AdminStatsDashboard /></Suspense>} />
                <Route path="cameras" element={<Suspense fallback={<LoadingScreen />}><AdminCameras /></Suspense>} />
                <Route path="users" element={<Suspense fallback={<LoadingScreen />}><AdminUsers /></Suspense>} />
                <Route path="inclusions" element={<Suspense fallback={<LoadingScreen />}><AdminInclusions/></Suspense>} />
                <Route path="bookings" element={<Suspense fallback={<LoadingScreen />}><AdminBookings /></Suspense>} />
                <Route path="rentals" element={<Suspense fallback={<LoadingScreen />}><AdminRentals /></Suspense>} />
                <Route path="extensions" element={<Suspense fallback={<LoadingScreen />}><AdminExtensions /></Suspense>} />
                <Route path="payments" element={<Suspense fallback={<LoadingScreen />}><AdminPayments /></Suspense>} />
                <Route path="delivery" element={<Suspense fallback={<LoadingScreen />}><AdminDelivery /></Suspense>} />
                <Route path="feedbacks" element={<Suspense fallback={<LoadingScreen />}><AdminFeedbacks /></Suspense>} />
                <Route path="booking-trends" element={<Suspense fallback={<LoadingScreen />}><BookingTrends /></Suspense>} />
                <Route path="monthly-heatmap" element={<Suspense fallback={<LoadingScreen />}><MonthlyHeatmap /></Suspense>} />
                <Route path="revenue" element={<Suspense fallback={<LoadingScreen />}><Revenue /></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<LoadingScreen />}><Settings /></Suspense>} />
              </Route>
            </Route>

            {/* User Routes (only accessible to logged-in user) */}
            <Route element={<ProtectedRoute requiredRole="user" />}>
              <Route
                path="/user"
                element={
                  <Suspense fallback={<LoadingScreen />}>
                    <UserDashboard />
                  </Suspense>
                }
              >
                <Route index element={<Suspense fallback={<LoadingScreen />}><Home /></Suspense>} />
                <Route path="home" element={<Suspense fallback={<LoadingScreen />}><Home /></Suspense>} />
                <Route path="search" element={<Suspense fallback={<LoadingScreen />}><Search /></Suspense>} />
                <Route path="cart" element={<Suspense fallback={<LoadingScreen />}><Cart /></Suspense>} />
                <Route path="booking" element={<Suspense fallback={<LoadingScreen />}><Booking /></Suspense>} />
                <Route path="educational" element={<Suspense fallback={<LoadingScreen />}><UserEducational /></Suspense>} />
                <Route path="profile" element={<Suspense fallback={<LoadingScreen />}><UserProfile /></Suspense>} />
              </Route>
              {/* Rental page outside UserDashboard navigation */}
              <Route path="/user/rental" element={<Suspense fallback={<LoadingScreen />}><Rental /></Suspense>} />
            </Route>

            {/* Catch-all for 404 Not Found */}
            <Route path="*" element={<NotFound />} />

          </Routes>

          {/* Add the toast manager */}
          <NotificationToastManager />
        </AuthErrorBoundary>
      </div>
    </BackHandlerProvider>
  );
}

export default App;
