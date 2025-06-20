import { Routes, Route } from 'react-router-dom'
import Home from './pages/home/Home'
import AuthPage from './pages/auth/AuthPage'
import Dashboard from './pages/user/Dashboard'
import CompleteProfile from './pages/user/CompleteProfile'
import RequireAuth from './pages/auth/RequireAuth'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/dashboard" element={
        <RequireAuth>
          <Dashboard />
        </RequireAuth>
      } />
      <Route path="/complete-profile" element={
        <RequireAuth>
          <CompleteProfile />
        </RequireAuth>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
