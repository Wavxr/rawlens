"use client"

import { Outlet, useNavigate, useLocation } from "react-router-dom"
import useAuthStore from "../../stores/useAuthStore"
import { Camera, Calendar, BookOpen, User, LogOut, Menu, X} from "lucide-react"
import { useState } from "react"

export default function UserDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((state) => state.logout)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      console.log('🎯 User handleLogout starting...');
      
      // Always clear local state first as a safety measure
      const authStore = useAuthStore.getState();
      
      await authStore.logout();
      console.log('✅ User logout completed, navigating...');
      
      // Force navigation with replace to prevent back button issues
      navigate("/login", { replace: true });
      
      // Additional cleanup - clear any remaining browser state
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      
    } catch (error) {
      console.error('❌ User logout error:', error);
      
      // Force cleanup and navigation even on error
      useAuthStore.getState().forceCleanup();
      navigate("/login", { replace: true });
    }
  }

  const navItems = [
    { path: "/user/cameras", label: "Browse Cameras", icon: Camera },
    { path: "/user/rentals", label: "My Rentals", icon: Calendar },
    { path: "/user/requests", label: "My Requests", icon: BookOpen },
    { path: "/user/educational", label: "Learn", icon: BookOpen },
    { path: "/user/profile", label: "Profile", icon: User },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Top Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Rawlens
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive(item.path)
                        ? "bg-blue-50 text-blue-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-3">

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => navigate("/user/profile")}
                  className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                </button>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center space-x-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200 text-sm font-medium"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all duration-200"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-200/50">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path)
                      setIsMobileMenuOpen(false)
                    }}
                    className={`flex items-center space-x-3 w-full px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive(item.path)
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 w-full px-3 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200 text-sm font-medium"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Navigation (Mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200/50 z-40">
        <div className="flex justify-around items-center py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center space-y-1 p-3 rounded-xl transition-all duration-200 ${
                  isActive(item.path) ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label.split(" ")[0]}</span>
                {isActive(item.path) && <div className="w-1 h-1 bg-blue-600 rounded-full"></div>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  )
}
