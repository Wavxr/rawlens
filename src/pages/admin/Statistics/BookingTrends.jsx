import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';
import { getBookingTrends } from '../../../services/dashboardService';
import { TrendingUp, Calendar, Camera, Activity, Loader2, AlertTriangle } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
const STATUS_COLORS = {
  pending: '#F59E0B',
  confirmed: '#10B981',
  active: '#3B82F6',
  completed: '#8B5CF6',
  cancelled: '#EF4444',
  rejected: '#6B7280'
};

export default function BookingTrends() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    const fetchBookingTrends = async () => {
      try {
        setLoading(true);
        const result = await getBookingTrends(timeRange);
        
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingTrends();
  }, [timeRange]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{formatDate(label)}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{data.payload.status}</p>
          <p style={{ color: data.color }} className="text-sm">
            Count: {data.value}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading booking trends...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2 text-red-400">
          <AlertTriangle className="h-6 w-6" />
          <span>Error loading trends: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Booking Trends</h1>
          <p className="text-gray-400 text-sm">Analyze booking patterns and trends</p>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="h-5 w-5 text-blue-400" />
            <TrendingUp className="h-4 w-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white">{data?.totalBookings || 0}</div>
          <p className="text-sm text-gray-400">Total Bookings</p>
          <p className="text-xs text-blue-400 mt-1">Last {timeRange} days</p>
        </div>

        <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="h-5 w-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {data?.dailyTrends ? Math.round(data.totalBookings / timeRange * 10) / 10 : 0}
          </div>
          <p className="text-sm text-gray-400">Avg Daily Bookings</p>
          <p className="text-xs text-green-400 mt-1">Per day average</p>
        </div>

        <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Camera className="h-5 w-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {data?.popularCameras?.length || 0}
          </div>
          <p className="text-sm text-gray-400">Active Camera Models</p>
          <p className="text-xs text-purple-400 mt-1">Being booked</p>
        </div>

        <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {data?.dailyTrends?.length > 7 
              ? Math.round(((data.dailyTrends.slice(-7).reduce((sum, day) => sum + day.bookings, 0) / 7) / 
                           (data.dailyTrends.slice(-14, -7).reduce((sum, day) => sum + day.bookings, 0) / 7) - 1) * 100)
              : 0}%
          </div>
          <p className="text-sm text-gray-400">Weekly Growth</p>
          <p className="text-xs text-emerald-400 mt-1">vs previous week</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Daily Booking Trends */}
        <div className="lg:col-span-8 bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Daily Booking Trends</h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.dailyTrends || []}>
                <defs>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="bookings"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorBookings)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="lg:col-span-4 bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Status Distribution</h3>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.statusDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data?.statusDistribution?.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Popular Cameras */}
      <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Most Popular Cameras</h3>
          <Camera className="h-5 w-5 text-gray-400" />
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.popularCameras || []} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
              <YAxis 
                type="category" 
                dataKey="camera" 
                stroke="#9CA3AF" 
                fontSize={12}
                width={120}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem'
                }}
              />
              <Bar dataKey="bookings" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Booking Pattern Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Peak Booking Days</h3>
          <div className="space-y-3">
            {data?.dailyTrends?.sort((a, b) => b.bookings - a.bookings).slice(0, 5).map((day, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                <div>
                  <p className="text-white font-medium">{formatDate(day.date)}</p>
                  <p className="text-gray-400 text-sm">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-blue-400 font-bold">{day.bookings}</p>
                  <p className="text-gray-500 text-sm">bookings</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Booking Insights</h3>
          <div className="space-y-4">
            <div className="p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                <p className="text-blue-300 font-medium">Growth Trend</p>
              </div>
              <p className="text-gray-300 text-sm">
                {data?.dailyTrends?.length > 14 
                  ? `${Math.round(((data.dailyTrends.slice(-7).reduce((sum, day) => sum + day.bookings, 0) / 7) / 
                                 (data.dailyTrends.slice(-14, -7).reduce((sum, day) => sum + day.bookings, 0) / 7) - 1) * 100)}% change`
                  : 'Insufficient data'}
                {' '}compared to previous period
              </p>
            </div>

            <div className="p-3 bg-green-900/20 border border-green-800/30 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="h-4 w-4 text-green-400" />
                <p className="text-green-300 font-medium">Most Active Status</p>
              </div>
              <p className="text-gray-300 text-sm">
                {data?.statusDistribution?.sort((a, b) => b.count - a.count)[0]?.status || 'N/A'} status
                {' '}dominates with{' '}
                {data?.statusDistribution?.length > 0 
                  ? Math.round((data.statusDistribution.sort((a, b) => b.count - a.count)[0]?.count / 
                               data.statusDistribution.reduce((sum, item) => sum + item.count, 0)) * 100)
                  : 0}% of bookings
              </p>
            </div>

            <div className="p-3 bg-purple-900/20 border border-purple-800/30 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Camera className="h-4 w-4 text-purple-400" />
                <p className="text-purple-300 font-medium">Top Camera</p>
              </div>
              <p className="text-gray-300 text-sm">
                {data?.popularCameras?.[0]?.camera || 'N/A'} leads with{' '}
                {data?.popularCameras?.[0]?.bookings || 0} bookings
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}