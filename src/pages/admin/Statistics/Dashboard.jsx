import React, { useState, useEffect } from "react"
import { Camera, Package, Users, TrendingUp, BarChart3, Activity, DollarSign, Loader2, AlertTriangle } from "lucide-react"
import { getDashboardStats, getRecentActivity } from "../../../services/dashboardService"

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [statsResult, activityResult] = await Promise.all([
        getDashboardStats(),
        getRecentActivity(5)
      ])

      if (statsResult.success) {
        setStats(statsResult.data)
      } else {
        setError(statsResult.error)
      }

      if (activityResult.success) {
        setRecentActivity(activityResult.data)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatChange = (change) => {
    const isPositive = change >= 0
    return `${isPositive ? '+' : ''}${change.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2 text-red-400">
          <AlertTriangle className="h-6 w-6" />
          <span>Error loading dashboard: {error}</span>
        </div>
      </div>
    )
  }

  const dashboardStats = [
    { 
      title: "Total Cameras", 
      value: stats?.totalCameras || 0, 
      icon: Camera, 
      change: "Available inventory",
      color: "blue"
    },
    { 
      title: "Active Rentals", 
      value: stats?.activeRentals || 0, 
      icon: Package, 
      change: `${stats?.rentalChange >= 0 ? '+' : ''}${stats?.rentalChange || 0} from yesterday`,
      color: "green"
    },
    { 
      title: "Total Users", 
      value: stats?.totalUsers || 0, 
      icon: Users, 
      change: `${formatChange(stats?.userChange || 0)} from last month`,
      color: "purple"
    },
    { 
      title: "Monthly Revenue", 
      value: formatCurrency(stats?.revenue || 0), 
      icon: TrendingUp, 
      change: `${formatChange(stats?.revenueChange || 0)} from last month`,
      color: "emerald"
    },
  ]

  const getColorClasses = (color) => {
    const colors = {
      blue: 'text-blue-400 bg-blue-500/10',
      green: 'text-green-400 bg-green-500/10',
      purple: 'text-purple-400 bg-purple-500/10',
      emerald: 'text-emerald-400 bg-emerald-500/10'
    }
    return colors[color] || colors.blue
  }

  const formatTimeAgo = (dateString) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`
    }
  }

  return (
    <div className="space-y-4 p-3">
      {/* Stats Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat, i) => {
          const Icon = stat.icon;
          const colorClasses = getColorClasses(stat.color)
          return (
            <div key={i} className="border border-gray-800/50 bg-gray-900/50 backdrop-blur-sm rounded-lg p-4 hover:bg-gray-800/30 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className={`p-1.5 rounded-md ${colorClasses}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl font-bold text-white mb-1">{stat.value}</div>
              <h3 className="text-xs font-medium text-gray-400 mb-1">{stat.title}</h3>
              <p className="text-xs text-gray-500">{stat.change}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics Grid */}
      <div className="grid gap-3 lg:grid-cols-12">
        {/* Revenue Per Camera */}
        <div className="lg:col-span-5 border border-gray-800/50 bg-gray-900/50 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-white">Revenue Per Camera</h3>
            <BarChart3 className="h-4 w-4 text-gray-400" />
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {stats?.revenuePerCamera?.map((camera, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-md bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
                <div className="flex-1">
                  <p className="text-xs font-medium text-white truncate">{camera.name}</p>
                  <p className="text-xs text-gray-500">#{index + 1} • Total Revenue</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400">{formatCurrency(camera.revenue)}</p>
                </div>
              </div>
            )) || (
              <div className="text-center py-4 text-gray-500">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No revenue data</p>
              </div>
            )}
          </div>
        </div>

        {/* Camera Trends */}
        <div className="lg:col-span-4 border border-gray-800/50 bg-gray-900/50 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-white">Camera Trends</h3>
            <Activity className="h-4 w-4 text-gray-400" />
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {stats?.cameraTrends?.map((camera, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-md bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
                <div className="flex-1">
                  <p className="text-xs font-medium text-white truncate">{camera.name}</p>
                  <p className="text-xs text-gray-500">30 days • Trending</p>
                </div>
                <div className="text-right flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  <p className="text-sm font-bold text-blue-400">{camera.bookings}</p>
                </div>
              </div>
            )) || (
              <div className="text-center py-4 text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No trend data</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-3 border border-gray-800/50 bg-gray-900/50 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-white">Recent Activity</h3>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start space-x-2 p-2 rounded-md bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white">
                    {activity.rental_status === 'pending' ? 'New request' : 
                     activity.rental_status === 'confirmed' ? 'Confirmed' :
                     activity.rental_status === 'active' ? 'Started' : 'Activity'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {activity.cameras?.name}
                  </p>
                  <p className="text-xs text-gray-500">{formatTimeAgo(activity.created_at)}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-4 text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Overview */}
      <div className="border border-gray-800/50 bg-gray-900/50 backdrop-blur-sm rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">Monthly Overview</h3>
          <TrendingUp className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-md bg-gray-800/30">
            <p className="text-2xl font-bold text-emerald-400 mb-1">{formatCurrency(stats?.totalProfit || 0)}</p>
            <p className="text-xs text-gray-400">Total Profit This Month</p>
            <p className="text-xs text-emerald-400">{formatChange(stats?.revenueChange || 0)} vs last month</p>
          </div>
          <div className="text-center p-3 rounded-md bg-gray-800/30">
            <p className="text-2xl font-bold text-blue-400 mb-1">{stats?.activeRentals || 0}</p>
            <p className="text-xs text-gray-400">Active Rentals</p>
            <p className="text-xs text-blue-400">Currently generating</p>
          </div>
          <div className="text-center p-3 rounded-md bg-gray-800/30">
            <p className="text-2xl font-bold text-purple-400 mb-1">{stats?.totalCameras || 0}</p>
            <p className="text-xs text-gray-400">Camera Inventory</p>
            <p className="text-xs text-purple-400">Available units</p>
          </div>
        </div>
      </div>
    </div>
  )
}
