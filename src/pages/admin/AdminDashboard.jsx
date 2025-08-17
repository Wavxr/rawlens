"use client"
import { useState, useEffect } from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import useAuthStore from "../../stores/useAuthStore"
import useThemeStore from '../../stores/useThemeStore'
import {
  Camera,
  Users,
  LogOut,
  Menu,
  X,
  Settings,
  Package,
  ChevronDown,
  Home,
  Calendar,
  Truck,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  TrendingUp,
  Map,
  Layers,
  PhilippinePeso,
  Sun,
  Moon
} from "lucide-react"

export default function AdminDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((state) => state.logout)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  // Main navigation items for desktop sidebar
const navigationSections = [
  {
    title: "Statistics & Metrics",
    items: [
      { name: "Dashboard", path: "/admin", icon: LayoutDashboard, exact: true },
      { name: "Calendar", path: "/admin/calendar", icon: Calendar },
      { name: "Booking Trends", path: "/admin/booking-trends", icon: TrendingUp },
      { name: "Monthly Heatmaps", path: "/admin/heatmaps", icon: Map },
      { name: "Revenue", path: "/admin/revenue", icon: PhilippinePeso }
    ]
  },
  {
    title: "Management",
    items: [
      { name: "Cameras", path: "/admin/cameras", icon: Camera },
      { name: "Inclusions", path: "/admin/inclusions", icon: Layers },
      { name: "Users", path: "/admin/users", icon: Users },
      { name: "Rentals", path: "/admin/rentals", icon: Package },
      { name: "Delivery", path: "/admin/delivery", icon: Truck },
      { name: "Settings", path: "/admin/settings", icon: Settings }
    ]
  }
];

// Flattened navigation items for mobile view
const navigationItems = navigationSections.flatMap(section => section.items);

// Navigation items for mobile bottom bar (usually a subset)
const mobileNavigationItems = [
  { name: "Home", path: "/admin", icon: Home, exact: true },
  { name: "Cameras", path: "/admin/cameras", icon: Camera },
  { name: "Rentals", path: "/admin/rentals", icon: Package },
  { name: "Delivery", path: "/admin/delivery", icon: Truck },
  { name: "Calendar", path: "/admin/calendar", icon: Calendar }
];

  const isActiveRoute = (path, exact = false) => {
    if (exact) {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarOpen && !event.target.closest(".sidebar-container") && !event.target.closest(".menu-button")) {
        setSidebarOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [sidebarOpen])

  // Auto-collapse sidebar on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setSidebarCollapsed(true)
      } else {
        setSidebarCollapsed(false)
      }
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const getCurrentPageName = () => {
    const currentItem = navigationItems.find((item) => isActiveRoute(item.path, item.exact))
    return currentItem?.name || "Dashboard"
  }

  // Theme toggle
  const { theme, toggleTheme } = useThemeStore()

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-gray-900 text-white overflow-hidden">
      {/* Mobile Header - Sticky */}
      <header className="lg:hidden bg-gray-900/95 backdrop-blur-md border-b border-gray-800/50 px-4 py-3 flex items-center justify-between fixed top-0 left-0 right-0 z-50 shadow-xl h-16">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
            <Camera className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Rawlens</h1>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="menu-button p-2 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-all duration-200"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>
      <div className="flex pt-16 lg:pt-0">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 transition-all duration-300 ease-in-out z-40 ${
            sidebarCollapsed ? "lg:w-20 overflow-x-hidden" : "lg:w-72"
          }`}
        >
          <div className="flex flex-col flex-grow bg-gray-900/90 backdrop-blur-xl border-r border-gray-800/50 shadow-2xl overflow-hidden">
            {/* Logo Section */}
            <div
              className={`flex items-center border-b border-gray-800/50 transition-all duration-300 ${
                sidebarCollapsed ? "px-4 py-6 justify-center" : "px-6 py-6"
              }`}
            >
              {sidebarCollapsed ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                  <button
                    onClick={() => setSidebarCollapsed(false)}
                    className="p-2 rounded-lg bg-gray-800/50 hover:bg-blue-600/20 hover:border-blue-500/30 border border-gray-700/50 transition-all duration-200 group"
                  >
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-400" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h1 className="text-xl font-bold text-white">Rawlens</h1>
                    <p className="text-xs text-blue-400 font-medium">Admin Dashboard</p>
                  </div>
                  <button
                    onClick={() => setSidebarCollapsed(true)}
                    className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-all duration-200"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-400" />
                  </button>
                </>
              )}
            </div>
            {/* Navigation */}
            <nav className={`flex-1 py-6 space-y-2 overflow-hidden ${sidebarCollapsed ? "px-3" : "px-4"}`}>
              {navigationSections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="mb-6">
                  {!sidebarCollapsed && (
                    <div className="px-4 mb-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {section.title}
                      </span>
                    </div>
                  )}
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = isActiveRoute(item.path, item.exact)
                      return (
                        <div key={item.path} className="relative group">
                          <button
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center text-left rounded-xl transition-all duration-200 ${
                              sidebarCollapsed ? "px-3 py-3 justify-center" : "px-4 py-2.5 mx-2"
                            } ${
                              isActive
                                ? sidebarCollapsed
                                  ? "bg-gradient-to-r from-blue-600/30 to-blue-500/20 text-blue-400 border border-blue-600/40 shadow-lg shadow-blue-500/20"
                                  : "bg-gradient-to-r from-blue-600/20 to-blue-500/10 text-blue-400 border border-blue-600/30 shadow-lg"
                                : sidebarCollapsed
                                  ? "text-gray-400 hover:bg-gray-800/60 hover:text-white hover:border-gray-600/50 border border-transparent"
                                  : "text-gray-300 hover:bg-gray-800/50 hover:text-white"
                            }`}
                            title={sidebarCollapsed ? item.name : ""}
                          >
                            <item.icon
                              className={`${sidebarCollapsed ? "h-5 w-5" : "h-4 w-4"} ${
                                isActive ? "text-blue-400" : "text-gray-400"
                              } transition-colors`}
                            />
                            {!sidebarCollapsed && <span className="ml-3 text-sm font-medium">{item.name}</span>}
                            {sidebarCollapsed && isActive && (
                              <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-blue-400 rounded-l-full"></div>
                            )}
                          </button>
                          {sidebarCollapsed && (
                            <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-gray-800/95 backdrop-blur-xl text-white text-sm px-4 py-2 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 border border-gray-700/50">
                              {item.name}
                              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-800/95 rotate-45 border-l border-b border-gray-700/50"></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
            {/* User Profile */}
            <div className={`border-t border-gray-800/50 ${sidebarCollapsed ? "px-3 py-4" : "px-4 py-4"}`}>
              <div className="relative group">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`w-full flex items-center text-left rounded-xl hover:bg-gray-800/50 transition-all duration-200 ${
                    sidebarCollapsed ? "px-3 py-4 justify-center" : "px-4 py-3"
                  }`}
                >
                  <div
                    className={`bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg ${
                      sidebarCollapsed ? "w-10 h-10 text-base" : "w-10 h-10"
                    }`}
                  >
                    A
                  </div>
                  {!sidebarCollapsed && (
                    <>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-white">Admin User</p>
                        <p className="text-xs text-gray-400">admin@rawlens.com</p>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                          userMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </>
                  )}
                </button>
                {/* Enhanced tooltip for collapsed user profile */}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-gray-800/95 backdrop-blur-xl text-white text-sm px-4 py-3 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 border border-gray-700/50">
                    <div className="font-medium">Admin User</div>
                    <div className="text-xs text-gray-400">admin@rawlens.com</div>
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-800/95 rotate-45 border-l border-b border-gray-700/50"></div>
                  </div>
                )}
                {userMenuOpen && !sidebarCollapsed && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-3 text-left text-red-400 hover:bg-red-500/10 transition-all duration-200"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
            <div className="sidebar-container fixed inset-y-0 left-0 w-80 bg-gray-900/95 backdrop-blur-xl border-r border-gray-800/50 shadow-2xl">
              <div className="flex flex-col h-full">
                {/* Mobile Logo */}
                <div className="flex items-center px-6 py-6 border-b border-gray-800/50">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                  <div className="ml-3">
                    <h1 className="text-xl font-bold text-white">Rawlens</h1>
                    <p className="text-xs text-blue-400 font-medium">Admin Dashboard</p>
                  </div>
                </div>
                {/* Mobile Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                  {navigationItems.map((item) => {
                    const isActive = isActiveRoute(item.path, item.exact)
                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path)
                          setSidebarOpen(false)
                        }}
                        className={`w-full flex items-center px-4 py-3 text-left rounded-xl transition-all duration-200 ${
                          isActive
                            ? "bg-gradient-to-r from-blue-600/20 to-blue-500/10 text-blue-400 border border-blue-600/30"
                            : "text-gray-300 hover:bg-gray-800/50 hover:text-white"
                        }`}
                      >
                        <item.icon className="h-5 w-5 mr-3" />
                        <span className="font-medium flex-1">{item.name}</span>
                      </button>
                    )
                  })}
                </nav>
                {/* Mobile Help Section */}
                <div className="px-4 py-4 border-t border-gray-800/50">
                  <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-600/20 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
                        <HelpCircle className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-white">Need Help?</h4>
                        <p className="text-xs text-gray-400">Check our documentation</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Mobile Logout */}
                <div className="px-4 py-4 border-t border-gray-800/50">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-3 text-left text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200"
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Main Content Area */}
        <div
          className={`flex-1 transition-all duration-300 overflow-x-hidden ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"}`}
        >
          {/* Desktop Header Bar - Sticky */}
          <header className="hidden lg:block bg-gray-900/50 backdrop-blur-xl border-b border-gray-800/50 px-6 py-4 shadow-lg sticky top-0 z-40">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-white">{getCurrentPageName()}</h1>
                <div className="text-sm text-gray-400">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full hover:bg-gray-700/50 transition-colors duration-200"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-5 w-5 text-yellow-400" />
                  ) : (
                    <Moon className="h-5 w-5 text-gray-700" />
                  )}
                </button>
                
                {/* User Avatar */}
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200">
                  A
                </div>
              </div>
            </div>
          </header>
          {/* Page Content */}
          <main className="w-full h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] p-4 overflow-auto">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      {/* Enhanced Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-t border-gray-800/50 px-2 py-2 shadow-2xl">
        <div className="flex justify-around items-center">
          {mobileNavigationItems.map((item) => {
            const isActive = isActiveRoute(item.path, item.exact)
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 ${
                  isActive ? "text-blue-400 bg-blue-600/10" : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                }`}
              >
                <item.icon className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">{item.name}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full"></div>
                )}
              </button>
            )
          })}
          {/* More Menu */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center py-2 px-3 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all duration-200"
          >
            <Menu className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </nav>
    </div>
  )
}