import React, { useState, useEffect } from 'react';
import { getMonthlyHeatmapData } from '../../../services/dashboardService';
import { Calendar, Activity, DollarSign, TrendingUp, Loader2, AlertTriangle } from 'lucide-react';

export default function MonthlyHeatmap() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('activity');

  useEffect(() => {
    fetchHeatmapData();
  }, []);

  const fetchHeatmapData = async () => {
    try {
      setLoading(true);
      const result = await getMonthlyHeatmapData();
      
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

  const getIntensity = (value, metric) => {
    if (!data || data.length === 0) return 0;
    
    const values = data.map(d => d[metric]).filter(v => v > 0);
    if (values.length === 0) return 0;
    
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    if (max === min) return value > 0 ? 1 : 0;
    
    return value === 0 ? 0 : Math.max(0.1, (value - min) / (max - min));
  };

  const getHeatmapColor = (intensity) => {
    if (intensity === 0) return 'bg-gray-800/30';
    if (intensity < 0.25) return 'bg-blue-900/40';
    if (intensity < 0.5) return 'bg-blue-800/60';
    if (intensity < 0.75) return 'bg-blue-600/80';
    return 'bg-blue-500';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMonthName = (monthIndex) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex];
  };

  const getDayName = (dayIndex) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayIndex];
  };

  // Group data by month for better visualization
  const groupedByMonth = data.reduce((acc, day) => {
    const monthKey = `${new Date(day.date).getFullYear()}-${new Date(day.date).getMonth()}`;
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(day);
    return acc;
  }, {});

  // Calculate statistics
  const totalStats = data.reduce((acc, day) => ({
    totalActivity: acc.totalActivity + day.activity,
    totalRentals: acc.totalRentals + day.rentals,
    totalRevenue: acc.totalRevenue + day.revenue,
    activeDays: acc.activeDays + (day.activity > 0 ? 1 : 0)
  }), { totalActivity: 0, totalRentals: 0, totalRevenue: 0, activeDays: 0 });

  const avgDailyActivity = data.length > 0 ? totalStats.totalActivity / data.length : 0;
  const avgDailyRevenue = data.length > 0 ? totalStats.totalRevenue / data.length : 0;

  // Find peak days
  const peakDays = data
    .filter(d => d[selectedMetric] > 0)
    .sort((a, b) => b[selectedMetric] - a[selectedMetric])
    .slice(0, 5);

  // Weekly patterns
  const weeklyPattern = Array(7).fill(0).map((_, dayOfWeek) => {
    const dayData = data.filter(d => d.dayOfWeek === dayOfWeek);
    const avgActivity = dayData.reduce((sum, d) => sum + d.activity, 0) / (dayData.length || 1);
    return {
      dayOfWeek,
      dayName: getDayName(dayOfWeek),
      avgActivity: Math.round(avgActivity * 10) / 10
    };
  });

  const metricConfig = {
    activity: {
      label: 'Total Activity',
      icon: Activity,
      color: 'text-blue-400',
      description: 'Combined rentals and payments'
    },
    rentals: {
      label: 'Rentals',
      icon: Calendar,
      color: 'text-green-400',
      description: 'Number of new rentals'
    },
    revenue: {
      label: 'Revenue',
      icon: DollarSign,
      color: 'text-emerald-400',
      description: 'Daily revenue amount'
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading heatmap...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2 text-red-400">
          <AlertTriangle className="h-6 w-6" />
          <span>Error loading heatmap: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Monthly Activity Heatmap</h1>
          <p className="text-gray-400 text-sm">Visualize activity patterns over time</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          >
            {Object.entries(metricConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="h-5 w-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalStats.totalActivity}</div>
          <p className="text-sm text-gray-400">Total Activity</p>
          <p className="text-xs text-blue-400 mt-1">{Math.round(avgDailyActivity * 10) / 10}/day avg</p>
        </div>

        <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="h-5 w-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalStats.totalRentals}</div>
          <p className="text-sm text-gray-400">Total Rentals</p>
          <p className="text-xs text-green-400 mt-1">
            {Math.round((totalStats.totalRentals / (data.length || 1)) * 10) / 10}/day avg
          </p>
        </div>

        <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            ₱{Math.round(totalStats.totalRevenue).toLocaleString()}
          </div>
          <p className="text-sm text-gray-400">Total Revenue</p>
          <p className="text-xs text-emerald-400 mt-1">
            ₱{Math.round(avgDailyRevenue).toLocaleString()}/day avg
          </p>
        </div>

        <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalStats.activeDays}</div>
          <p className="text-sm text-gray-400">Active Days</p>
          <p className="text-xs text-purple-400 mt-1">
            {Math.round((totalStats.activeDays / (data.length || 1)) * 100)}% of days
          </p>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Activity Heatmap - Last 6 Months</h3>
          <div className="flex items-center space-x-2">
            {React.createElement(metricConfig[selectedMetric].icon, {
              className: `h-5 w-5 ${metricConfig[selectedMetric].color}`
            })}
            <span className={`text-sm ${metricConfig[selectedMetric].color}`}>
              {metricConfig[selectedMetric].description}
            </span>
          </div>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-8 gap-1 mb-2">
          <div></div>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-xs text-gray-400 text-center py-1">{day}</div>
          ))}
        </div>

        {/* Heatmap by months */}
        <div className="space-y-3">
          {Object.entries(groupedByMonth)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([monthKey, monthData]) => {
              const [year, month] = monthKey.split('-');
              const monthName = getMonthName(parseInt(month));
              
              // Create a grid for the month (7 columns for days of week)
              const weekGrid = [];
              const sortedDays = monthData.sort((a, b) => new Date(a.date) - new Date(b.date));
              
              // Create weeks
              let currentWeek = new Array(7).fill(null);
              let weekIndex = 0;
              
              sortedDays.forEach(day => {
                const dayOfWeek = (new Date(day.date).getDay() + 6) % 7;
                
                if (weekIndex === 0) {
                  // First week, position according to day of week
                  currentWeek[dayOfWeek] = day;
                } else {
                  currentWeek[dayOfWeek] = day;
                }
                
                // If it's Sunday or last day of month, push the week
                if (dayOfWeek === 6 || day === sortedDays[sortedDays.length - 1]) {
                  weekGrid.push([...currentWeek]);
                  currentWeek = new Array(7).fill(null);
                  weekIndex++;
                }
              });
              
              return (
                <div key={monthKey} className="space-y-1">
                  <div className="text-sm font-medium text-gray-300 mb-1">
                    {monthName} {year}
                  </div>
                  {weekGrid.map((week, weekIdx) => (
                    <div key={weekIdx} className="grid grid-cols-8 gap-1">
                      {weekIdx === 0 && (
                        <div className="text-xs text-gray-400 text-right pr-2 py-1">
                          {monthName.slice(0, 3)}
                        </div>
                      )}
                      {weekIdx > 0 && <div></div>}
                      {week.map((day, dayIdx) => (
                        <div
                          key={dayIdx}
                          className={`
                            w-3 h-3 rounded-sm cursor-pointer transition-all duration-200
                            ${day 
                              ? `${getHeatmapColor(getIntensity(day[selectedMetric], selectedMetric))} hover:scale-110` 
                              : 'bg-transparent'
                            }
                          `}
                          title={day ? `${formatDate(day.date)}: ${day[selectedMetric]} ${selectedMetric}` : ''}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700/50">
          <div className="text-xs text-gray-400">
            Showing {metricConfig[selectedMetric].label.toLowerCase()} intensity
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">Less</span>
            <div className="flex space-x-1">
              {['bg-gray-800/30', 'bg-blue-900/40', 'bg-blue-800/60', 'bg-blue-600/80', 'bg-blue-500'].map((color, idx) => (
                <div key={idx} className={`w-3 h-3 rounded-sm ${color}`} />
              ))}
            </div>
            <span className="text-xs text-gray-400">More</span>
          </div>
        </div>
      </div>

      {/* Analysis Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Peak Activity Days */}
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Peak Activity Days</h3>
          <div className="space-y-3">
            {peakDays.map((day, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                <div>
                  <p className="text-white font-medium">{formatDate(day.date)}</p>
                  <p className="text-gray-400 text-sm">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-blue-400 font-bold">{day[selectedMetric]}</p>
                  <p className="text-gray-500 text-sm">{selectedMetric}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Pattern */}
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Weekly Activity Pattern</h3>
          <div className="space-y-3">
            {weeklyPattern.map((day, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-8 bg-blue-500 rounded" 
                       style={{ height: `${Math.max(8, (day.avgActivity / Math.max(...weeklyPattern.map(d => d.avgActivity)) * 32))}px` }} />
                  <div>
                    <p className="text-white font-medium">{day.dayName}</p>
                    <p className="text-gray-400 text-sm">Average activity</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-blue-400 font-bold">{day.avgActivity}</p>
                  <p className="text-gray-500 text-sm">per day</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Monthly Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(groupedByMonth)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 6)
            .map(([monthKey, monthData]) => {
              const [year, month] = monthKey.split('-');
              const monthName = getMonthName(parseInt(month));
              const monthStats = monthData.reduce((acc, day) => ({
                activity: acc.activity + day.activity,
                rentals: acc.rentals + day.rentals,
                revenue: acc.revenue + day.revenue
              }), { activity: 0, rentals: 0, revenue: 0 });
              
              return (
                <div key={monthKey} className="p-4 bg-gray-800/30 rounded-lg">
                  <h4 className="text-white font-medium mb-3">{monthName} {year}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Activity</span>
                      <span className="text-blue-400">{monthStats.activity}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Rentals</span>
                      <span className="text-green-400">{monthStats.rentals}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Revenue</span>
                      <span className="text-emerald-400">₱{Math.round(monthStats.revenue).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}