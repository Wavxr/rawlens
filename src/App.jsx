// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import RedirectRoute from './components/RedirectRoute';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCameras from './pages/admin/Cameras';
import AdminUsers from './pages/admin/Users';

// User
import UserDashboard from './pages/user/UserDashboard';
import UserCameras from './pages/user/Cameras';
import UserRent from './pages/user/Rent';
import UserEducational from './pages/user/Educational';
import UserProfile from './pages/user/Profile';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        {/* Redirect authenticated users */}
        <Route path="/dashboard" element={<RedirectRoute />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminDashboard />}>
          <Route index element={<AdminCameras />} />
          <Route path="cameras" element={<AdminCameras />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>

        {/* User Routes */}
        <Route path="/user" element={<UserDashboard />}>
          <Route index element={<UserCameras />} />
          <Route path="cameras" element={<UserCameras />} />
          <Route path="rent" element={<UserRent />} />
          <Route path="educational" element={<UserEducational />} />
          <Route path="profile" element={<UserProfile />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;