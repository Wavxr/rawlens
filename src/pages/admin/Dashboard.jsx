import { Camera, Package, Users, TrendingUp } from "lucide-react"

export default function Dashboard() {
  // This is a placeholder for the dashboard statistics
  const stats = [
    { title: "Total Cameras", value: "24", icon: Camera, change: "+12% from last month" },
    { title: "Active Rentals", value: "18", icon: Package, change: "+5 from yesterday" },
    { title: "Total Users", value: "156", icon: Users, change: "+8% from last month" },
    { title: "Revenue", value: "₱45,230", icon: TrendingUp, change: "+19% from last month" },
  ]

  return (
    <div className="space-y-6 p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-gray-400">
          Welcome back! Here's what's happening with your rental business.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="border border-gray-800/50 bg-gray-900/50 backdrop-blur-sm rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-400">{stat.title}</h3>
                <Icon className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Activity */}
        <div className="lg:col-span-4 border border-gray-800/50 bg-gray-900/50 backdrop-blur-sm rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start pb-4 border-b border-gray-800 last:border-0 last:pb-0">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-white">New rental request received</p>
                  <p className="text-xs text-gray-500">Canon EOS R5 • 2 hours ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-3 border border-gray-800/50 bg-gray-900/50 backdrop-blur-sm rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button className="w-full flex items-center p-3 rounded-lg hover:bg-gray-800/50 transition-colors text-left">
              <Package className="h-4 w-4 mr-2 text-blue-500" />
              <span>Add New Camera</span>
            </button>
            <button className="w-full flex items-center p-3 rounded-lg hover:bg-gray-800/50 transition-colors text-left">
              <Users className="h-4 w-4 mr-2 text-green-500" />
              <span>View All Users</span>
            </button>
            <button className="w-full flex items-center p-3 rounded-lg hover:bg-gray-800/50 transition-colors text-left">
              <TrendingUp className="h-4 w-4 mr-2 text-purple-500" />
              <span>View Analytics</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
