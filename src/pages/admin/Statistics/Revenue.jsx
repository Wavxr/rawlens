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
import { getRevenueAnalytics } from '../../../services/dashboardService';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PieChart as PieChartIcon, 
  BarChart3,
  Target,
  Loader2, 
  AlertTriangle 
} from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function Revenue() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      const result = await getRevenueAnalytics();
      
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatMonth = (monthString) => {
    const [year, month] = monthString.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{formatMonth(label)}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              Revenue: {formatCurrency(entry.value)}
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
          <p className="text-white font-medium">{data.payload.type}</p>
          <p style={{ color: data.color }} className="text-sm">
            Revenue: {formatCurrency(data.value)}
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
          <span>Loading revenue analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2 text-red-400">
          <AlertTriangle className="h-6 w-6" />
          <span>Error loading revenue data: {error}</span>
        </div>
      </div>
    );
  }

  const revenueGrowth = data?.revenueGrowth || 0;
  const isPositiveGrowth = revenueGrowth >= 0;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Revenue Analytics</h1>
        <p className="text-gray-400 text-sm">Comprehensive revenue insights and trends</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            {isPositiveGrowth ? 
              <TrendingUp className="h-4 w-4 text-green-400" /> : 
              <TrendingDown className="h-4 w-4 text-red-400" />
            }
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(data?.totalRevenue || 0)}
          </div>
          <p className="text-sm text-gray-400">Total Revenue</p>
          <p className="text-xs text-emerald-400 mt-1">All time</p>
        </div>

        <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-5 w-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(data?.currentMonthRevenue || 0)}
          </div>
          <p className="text-sm text-gray-400">This Month</p>
          <p className={`text-xs mt-1 ${isPositiveGrowth ? 'text-green-400' : 'text-red-400'}`}>
            {isPositiveGrowth ? '+' : ''}{revenueGrowth.toFixed(1)}% vs last month
          </p>
        </div>

        <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Target className="h-5 w-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {data?.avgProfitMargin?.toFixed(1) || 0}%
          </div>
          <p className="text-sm text-gray-400">Avg Profit Margin</p>
          <p className="text-xs text-purple-400 mt-1">After costs</p>
        </div>

        <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="h-5 w-5 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency((data?.currentMonthRevenue || 0) / (new Date().getDate()))}
          </div>
          <p className="text-sm text-gray-400">Avg Daily Revenue</p>
          <p className="text-xs text-orange-400 mt-1">This month</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Monthly Revenue Trend */}
        <div className="lg:col-span-8 bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Monthly Revenue Trend</h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.monthlyRevenue || []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={formatMonth}
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Type */}
        <div className="lg:col-span-4 bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Revenue by Type</h3>
            <PieChartIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.revenueByType || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {data?.revenueByType?.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Profit Margins Analysis */}
      <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Top Performing Cameras by Profit</h3>
          <Target className="h-5 w-5 text-gray-400" />
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.profitMargins || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                type="number" 
                stroke="#9CA3AF" 
                fontSize={12}
                tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
              />
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
                formatter={(value, name) => [
                  name === 'profit' ? formatCurrency(value) : `${value.toFixed(1)}%`,
                  name === 'profit' ? 'Profit' : 'Margin'
                ]}
              />
              <Bar dataKey="profit" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Growth Analysis */}
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Growth Analysis</h3>
          <div className="space-y-4">
            <div className={`p-3 rounded-lg ${isPositiveGrowth ? 'bg-green-900/20 border border-green-800/30' : 'bg-red-900/20 border border-red-800/30'}`}>
              <div className="flex items-center space-x-2 mb-2">
                {isPositiveGrowth ? 
                  <TrendingUp className="h-4 w-4 text-green-400" /> :
                  <TrendingDown className="h-4 w-4 text-red-400" />
                }
                <p className={`font-medium ${isPositiveGrowth ? 'text-green-300' : 'text-red-300'}`}>
                  Monthly Growth
                </p>
              </div>
              <p className="text-gray-300 text-sm">
                {isPositiveGrowth ? 'Revenue increased' : 'Revenue decreased'} by{' '}
                <span className={`font-bold ${isPositiveGrowth ? 'text-green-400' : 'text-red-400'}`}>
                  {Math.abs(revenueGrowth).toFixed(1)}%
                </span>
                {' '}compared to last month
              </p>
            </div>

            <div className="p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-4 w-4 text-blue-400" />
                <p className="text-blue-300 font-medium">Revenue Velocity</p>
              </div>
              <p className="text-gray-300 text-sm">
                Generating{' '}
                <span className="font-bold text-blue-400">
                  {formatCurrency((data?.currentMonthRevenue || 0) / (new Date().getDate()))}
                </span>
                {' '}per day on average this month
              </p>
            </div>

            <div className="p-3 bg-purple-900/20 border border-purple-800/30 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-4 w-4 text-purple-400" />
                <p className="text-purple-300 font-medium">Profit Efficiency</p>
              </div>
              <p className="text-gray-300 text-sm">
                Average profit margin of{' '}
                <span className="font-bold text-purple-400">
                  {data?.avgProfitMargin?.toFixed(1) || 0}%
                </span>
                {' '}across all rentals
              </p>
            </div>
          </div>
        </div>

        {/* Top Revenue Sources */}
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue Sources</h3>
          <div className="space-y-3">
            {data?.revenueByType?.sort((a, b) => b.revenue - a.revenue).map((source, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div>
                    <p className="text-white font-medium capitalize">{source.type}</p>
                    <p className="text-gray-400 text-sm">
                      {((source.revenue / (data?.totalRevenue || 1)) * 100).toFixed(1)}% of total
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-bold">{formatCurrency(source.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Projections */}
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Projections</h3>
          <div className="space-y-4">
            <div className="p-3 bg-gray-800/30 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Projected Month-End</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency((data?.currentMonthRevenue || 0) / new Date().getDate() * new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate())}
              </p>
              <p className="text-xs text-gray-500 mt-1">Based on current daily average</p>
            </div>

            <div className="p-3 bg-gray-800/30 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Best Performing Month</p>
              <p className="text-xl font-bold text-emerald-400">
                {formatCurrency(Math.max(...(data?.monthlyRevenue?.map(m => m.revenue) || [0])))}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatMonth(data?.monthlyRevenue?.find(m => m.revenue === Math.max(...(data?.monthlyRevenue?.map(m => m.revenue) || [0])))?.month || '')}
              </p>
            </div>

            <div className="p-3 bg-gray-800/30 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Revenue Goal</p>
              <p className="text-xl font-bold text-blue-400">
                {formatCurrency((data?.currentMonthRevenue || 0) * 1.2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">20% above current month</p>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, ((data?.currentMonthRevenue || 0) / ((data?.currentMonthRevenue || 0) * 1.2)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Comparison Table */}
      <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Monthly Performance Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-400 font-medium py-3 px-4">Month</th>
                <th className="text-right text-gray-400 font-medium py-3 px-4">Revenue</th>
                <th className="text-right text-gray-400 font-medium py-3 px-4">Growth</th>
                <th className="text-right text-gray-400 font-medium py-3 px-4">Trend</th>
              </tr>
            </thead>
            <tbody>
              {data?.monthlyRevenue?.slice(-6).map((month, index, arr) => {
                const prevRevenue = index > 0 ? arr[index - 1].revenue : month.revenue;
                const growth = prevRevenue > 0 ? ((month.revenue - prevRevenue) / prevRevenue * 100) : 0;
                const isGrowthPositive = growth >= 0;
                
                return (
                  <tr key={month.month} className="border-b border-gray-800/50">
                    <td className="py-3 px-4 text-white">{formatMonth(month.month)}</td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-medium">
                      {formatCurrency(month.revenue)}
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${isGrowthPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {index > 0 ? `${isGrowthPositive ? '+' : ''}${growth.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {index > 0 && (
                        isGrowthPositive ? 
                        <TrendingUp className="h-4 w-4 text-green-400 inline" /> :
                        <TrendingDown className="h-4 w-4 text-red-400 inline" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}