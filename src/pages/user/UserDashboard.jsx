// src/components/UserDashboard.jsx
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import useAuthStore from "../../stores/useAuthStore"
import { Camera, Calendar, BookOpen, User, Menu, X, Bell } from "lucide-react"
import { useState } from "react"

export default function UserDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = [
    { path: "/user/cameras", label: "Browse Cameras", icon: Camera, shortLabel: "Browse" },
    { path: "/user/rentals", label: "My Rentals", icon: Calendar, shortLabel: "Rentals" },
    { path: "/user/requests", label: "My Requests", icon: BookOpen, shortLabel: "Requests" },
    { path: "/user/educational", label: "Learn", icon: BookOpen, shortLabel: "Learn" },
    { path: "/user/profile", label: "Profile", icon: User, shortLabel: "Profile" },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Top Navigation Bar - Desktop Only */}
      <nav className="bg-white/95 backdrop-blur-xl border-b border-gray-200/80 sticky top-0 z-50 shadow-sm hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Modern Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all duration-300">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">Rawlens</span>
                <div className="text-xs text-gray-500 font-medium hidden sm:block">Camera Rental Hub</div>
              </div>
            </div>

            {/* Modern Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.02] ${
                      active
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Modern Right Side Actions */}
            <div className="flex items-center space-x-2">

              {/* Modern Profile Button */}
              <button
                onClick={() => navigate("/user/profile")}
                className="flex items-center space-x-2 p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="hidden xl:block text-left">
                  <div className="text-sm font-medium">Account</div>
                  <div className="text-xs text-gray-500">Profile</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </nav>


      {/* Modern Bottom Navigation (Mobile) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200/80 z-40 shadow-lg">
        <div className="flex justify-around items-center py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative flex flex-col items-center space-y-1 p-3 rounded-xl transition-all duration-200 min-w-0 flex-1 ${
                  active ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <div className={`relative ${active ? 'transform scale-110' : 'hover:scale-105'} transition-transform duration-200`}>
                  <Icon className="h-5 w-5" />
                  {active && (
                    <div className="absolute inset-0 bg-blue-100 rounded-lg scale-150 -z-10"></div>
                  )}
                </div>
                <span className="text-xs font-medium truncate w-full text-center">{item.shortLabel}</span>
                {active && (
                  <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Modern Main Content */}
      <main className="pb-20 lg:pb-6 pt-0 lg:pt-0">
        <Outlet />
      </main>
    </div>
  )
}