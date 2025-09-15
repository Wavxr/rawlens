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
  Moon,
  UserStar,
  CalendarPlus,
  CreditCard,
} from "lucide-react";

export default function AdminDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((state) => state.logout)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      const authStore = useAuthStore.getState();
      await authStore.logout();
      navigate("/login", { replace: true });
      
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
    } catch (error) {
      useAuthStore.getState().forceCleanup();
      navigate("/login", { replace: true });
    }
  }

  const navigationSections = [
    {
      title: "Statistics & Metrics",
      items: [
        { name: "Dashboard", path: "/admin", icon: LayoutDashboard, exact: true },
        { name: "Booking Trends", path: "/admin/booking-trends", icon: TrendingUp },
        { name: "Monthly Heatmaps", path: "/admin/heatmaps", icon: Map },
        { name: "Revenue", path: "/admin/revenue", icon: PhilippinePeso },
        { name: "Feedbacks", path: "/admin/feedbacks", icon: UserStar }
      ]
    },
    {
      title: "Management",
      items: [
        { name: "Cameras", path: "/admin/cameras", icon: Camera },
        { name: "Inclusions", path: "/admin/inclusions", icon: Layers },
        { name: "Users", path: "/admin/users", icon: Users },
        { name: "Bookings", path: "/admin/bookings", icon: Calendar },
        { name: "Rentals", path: "/admin/rentals", icon: Package },
        { name: "Extensions", path: "/admin/extensions", icon: CalendarPlus },
        { name: "Payments", path: "/admin/payments", icon: CreditCard },
        { name: "Delivery", path: "/admin/delivery", icon: Truck },
        { name: "Settings", path: "/admin/settings", icon: Settings }
      ]
    }
  ];

  const navigationItems = navigationSections.flatMap(section => section.items);

  const mobileNavigationItems = [
    { name: "Home", path: "/admin", icon: Home, exact: true },
    { name: "Cameras", path: "/admin/cameras", icon: Camera },
    { name: "Bookings", path: "/admin/bookings", icon: Calendar },
    { name: "Rentals", path: "/admin/rentals", icon: Package },
    { name: "Delivery", path: "/admin/delivery", icon: Truck }
  ];

  const isActiveRoute = (path, exact = false) => {
    if (exact) {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarOpen && !event.target.closest(".sidebar-container") && !event.target.closest(".menu-button")) {
        setSidebarOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [sidebarOpen])

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

  const { theme, toggleTheme } = useThemeStore()

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 transition-all duration-200 z-40 ${
            sidebarCollapsed ? "lg:w-16" : "lg:w-60"
          }`}
        >
          <div className="flex flex-col flex-grow bg-gray-900/80 backdrop-blur-xl border-r border-gray-800 overflow-hidden">
            {/* Logo Section */}
            <div
              className={`flex items-center border-b border-gray-800 transition-all duration-200 ${
                sidebarCollapsed ? "px-3 py-4 justify-center" : "px-4 py-4"
              }`}
            >
              {sidebarCollapsed ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                  <button
                    onClick={() => setSidebarCollapsed(false)}
                    className="p-1 rounded bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                  >
                    <ChevronRight className="h-3 w-3 text-gray-400" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                  <div className="ml-2.5 flex-1">
                    <h1 className="text-base font-semibold text-white">Rawlens</h1>
                    <p className="text-xs text-blue-400">Admin Dashboard</p>
                  </div>
                  <button
                    onClick={() => setSidebarCollapsed(true)}
                    className="p-1 rounded bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                  >
                    <ChevronLeft className="h-3 w-3 text-gray-400" />
                  </button>
                </>
              )}
            </div>

            {/* Navigation */}
            <nav className={`flex-1 py-4 ${sidebarCollapsed ? "px-2" : "px-3"}`}>
              {navigationSections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="mb-5">
                  {!sidebarCollapsed && (
                    <div className="px-3 mb-2">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {section.title}
                      </span>
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const isActive = isActiveRoute(item.path, item.exact)
                      return (
                        <button
                          key={item.path}
                          onClick={() => navigate(item.path)}
                          className={`w-full flex items-center text-left rounded-lg transition-colors ${
                            sidebarCollapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2 mx-1"
                          } ${
                            isActive
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "text-gray-400 hover:bg-gray-800/60 hover:text-gray-200"
                          }`}
                          title={sidebarCollapsed ? item.name : ""}
                        >
                          <item.icon
                            className={`${sidebarCollapsed ? "h-4 w-4" : "h-4 w-4"} transition-colors`}
                          />
                          {!sidebarCollapsed && <span className="ml-3 text-sm font-medium">{item.name}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* User Profile */}
            <div className={`border-t border-gray-800 ${sidebarCollapsed ? "px-2 py-3" : "px-3 py-3"}`}>
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`w-full flex items-center text-left rounded-lg hover:bg-gray-800/50 transition-colors ${
                    sidebarCollapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2"
                  }`}
                >
                  <div
                    className={`bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-medium ${
                      sidebarCollapsed ? "w-8 h-8" : "w-8 h-8"
                    }`}
                  >
                    A
                  </div>
                  {!sidebarCollapsed && (
                    <>
                      <div className="ml-2.5 flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">Admin User</p>
                        <p className="text-xs text-gray-400 truncate">admin@rawlens.com</p>
                      </div>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                          userMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </>
                  )}
                </button>
                {userMenuOpen && !sidebarCollapsed && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-gray-800/90 backdrop-blur-xl border border-gray-700 rounded-lg shadow-lg overflow-hidden">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-3 py-2 text-left text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5 mr-2" />
                      <span className="text-sm">Logout</span>
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
            <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)}></div>
            <div className="sidebar-container fixed inset-y-0 left-0 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-gray-800">
              <div className="flex flex-col h-full">
                <div className="flex items-center px-4 py-4 border-b border-gray-800">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                  <div className="ml-2.5">
                    <h1 className="text-base font-semibold text-white">Rawlens</h1>
                    <p className="text-xs text-blue-400">Admin Dashboard</p>
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="ml-auto p-1 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                  {navigationItems.map((item) => {
                    const isActive = isActiveRoute(item.path, item.exact)
                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path)
                          setSidebarOpen(false)
                        }}
                        className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                          isActive
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : "text-gray-400 hover:bg-gray-800/60 hover:text-gray-200"
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="ml-3 text-sm font-medium">{item.name}</span>
                      </button>
                    )
                  })}
                </nav>
                <div className="px-3 py-3 border-t border-gray-800">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-3 py-2 text-left text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    <span className="text-sm">Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div
          className={`flex-1 transition-all duration-200 ${sidebarCollapsed ? "lg:ml-16" : "lg:ml-60"}`}
        >
          {/* Desktop Header */}
          <header className="hidden lg:block bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 px-5 py-3 sticky top-0 z-40">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h1 className="text-lg font-semibold text-white">{getCurrentPageName()}</h1>
                <div className="text-xs text-gray-400">
                  {new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleTheme}
                  className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-yellow-400" />
                  ) : (
                    <Moon className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-medium">
                  A
                </div>
              </div>
            </div>
          </header>

          {/* Page Content - No padding top on mobile since no header */}
          <main className="w-full h-screen lg:h-[calc(100vh-3rem)] overflow-auto hide-scrollbar">
            <div className="w-full hide-scrollbar">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-xl border-t border-gray-800 px-1 py-1.5">
        <div className="flex justify-around items-center">
          {mobileNavigationItems.map((item) => {
            const isActive = isActiveRoute(item.path, item.exact)
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center py-1.5 px-2 rounded-lg transition-colors ${
                  isActive ? "text-blue-400 bg-blue-500/10" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-[10px] mt-0.5 font-medium">{item.name}</span>
              </button>
            )
          })}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center py-1.5 px-2 rounded-lg text-gray-400 hover:text-gray-200 transition-colors"
          >
            <Menu className="h-4 w-4" />
            <span className="text-[10px] mt-0.5 font-medium">More</span>
          </button>
        </div>
      </nav>
    </div>
  )
}