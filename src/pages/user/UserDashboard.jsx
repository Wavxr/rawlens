import { Outlet, useNavigate, useLocation } from "react-router-dom"
import useAuthStore from "../../stores/useAuthStore"
import { Home, Search, ShoppingCart, Calendar, User, Camera, ChevronDown, LogOut } from "lucide-react"
import { useState, useEffect, useRef } from "react"

export default function UserDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, logout } = useAuthStore()
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsAccountDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Get user's full name
  const getUserFullName = () => {
    // Use profile data which contains first_name and last_name from users table
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    }
    // Fallback to email username if profile is not loaded
    return user?.email?.split('@')[0] || 'User'
  }

  const navItems = [
    { path: "/user/home", label: "Home", icon: Home, shortLabel: "Home" },
    { path: "/user/search", label: "Search", icon: Search, shortLabel: "Search" },
    { path: "/user/cart", label: "Cart", icon: ShoppingCart, shortLabel: "Cart" },
    { path: "/user/booking", label: "Booking", icon: Calendar, shortLabel: "Booking" },
    { path: "/user/profile", label: "Profile", icon: User, shortLabel: "Profile" },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Subtly Visible Floating Top Navigation Bar - Desktop Only */}
      <nav className="absolute top-4 left-1/2 transform -translate-x-1/2 w-[95%] max-w-7xl z-50 hidden lg:block">
        <div className="bg-white/95 backdrop-blur-xl border border-gray-200/70 rounded-lg shadow-lg shadow-gray-200/30">
          <div className="px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Refined Logo */}
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-gradient-to-br from-[#052844] to-[#063a5e] rounded-lg flex items-center justify-center shadow-md shadow-[#052844]/20">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="text-lg font-bold text-gray-900">RAWLENS</span>
                  <div className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase">CAMERA RENTALS</div>
                </div>
              </div>

              {/* Underline-Style Desktop Navigation */}
              <div className="hidden lg:flex items-center space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.path)
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                        active
                          ? "text-[#052844] bg-[#052844]/5"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="relative">
                        {item.label}
                        {active && (
                          <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-[#052844] rounded-full"></span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Subtle Right Side Actions */}
              <div className="flex items-center space-x-2">
                {/* Account Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                    className="flex items-center space-x-2 px-2 py-2 text-gray-600 hover:text-gray-900 rounded-lg transition-all duration-150 hover:bg-gray-50"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-[#052844] to-[#063a5e] rounded-lg flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-150 ${
                      isAccountDropdownOpen ? 'rotate-180' : ''
                    }`} />
                  </button>

                  {/* Dropdown Menu */}
                  <div className={`absolute right-0 top-full mt-2 w-64 bg-white/95 backdrop-blur-xl border border-gray-200/70 rounded-lg shadow-lg shadow-gray-200/30 z-50 transition-all duration-150 transform origin-top-right ${
                    isAccountDropdownOpen 
                      ? 'opacity-100 scale-100 translate-y-0' 
                      : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                  }`}>
                    {/* User Info Section */}
                    <div className="px-4 py-3 border-b border-gray-100/70">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#052844] to-[#063a5e] rounded-lg flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {getUserFullName()}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user?.email || 'user@example.com'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Dropdown Actions */}
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setIsAccountDropdownOpen(false)
                          handleLogout()
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50/70 hover:text-red-700 transition-colors duration-100"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Modern Compact Bottom Navigation (Mobile) */}
      <div className="lg:hidden fixed inset-x-0 bottom-2 mx-2 bg-white/95 backdrop-blur-xl border border-gray-200/70 rounded-xl shadow-lg shadow-gray-200/30 z-40 pb-0">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center space-y-1 p-2.5 rounded-lg transition-all duration-150 min-w-0 flex-1 ${
                  active ? "text-[#052844]" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <div className={`p-2 rounded-lg transition-all duration-150 ${
                  active 
                    ? "bg-[#052844]/10 scale-105" 
                    : "hover:bg-gray-100"
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold tracking-wide truncate w-full text-center">{item.shortLabel}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content - Adjusted padding for mobile navbar and gesture bar */}
      <main className="pt-0 lg:pt-24 pb-18 lg:pb-6">
        <Outlet />
      </main>
    </div>
  )
}