import { supabase } from '../lib/supabaseClient';

// Dashboard statistics aggregation service
export async function getDashboardStats() {
  try {
    // Get current date for month calculations
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Format dates for SQL
    const currentMonthStart = startOfMonth.toISOString().split('T')[0];
    const currentMonthEnd = endOfMonth.toISOString().split('T')[0];
    const lastMonthStart = startOfLastMonth.toISOString().split('T')[0];
    const lastMonthEnd = endOfLastMonth.toISOString().split('T')[0];

    // Parallel fetch all required data
    const [
      camerasResult,
      rentalsResult,
      usersResult,
      currentMonthPayments,
      lastMonthPayments,
      revenuePerCameraResult,
      cameraTrendsResult
    ] = await Promise.all([
      // Total cameras
      supabase
        .from('cameras')
        .select('id, camera_status')
        .neq('camera_status', 'unavailable'),
      
      // Active rentals (confirmed and active status)
      supabase
        .from('rentals')
        .select('id, rental_status, created_at')
        .in('rental_status', ['confirmed', 'active']),
      
      // Total users
      supabase
        .from('users')
        .select('id, created_at'),
      
      // Current month payments for revenue calculation
      supabase
        .from('payments')
        .select('amount, created_at, payment_status')
        .eq('payment_status', 'verified')
        .gte('created_at', currentMonthStart)
        .lte('created_at', currentMonthEnd + 'T23:59:59'),
      
      // Last month payments for comparison
      supabase
        .from('payments')
        .select('amount, created_at, payment_status')
        .eq('payment_status', 'verified')
        .gte('created_at', lastMonthStart)
        .lte('created_at', lastMonthEnd + 'T23:59:59'),
      
      // Revenue per camera data
      getRevenuePerCamera(),
      
      // Camera trends data
      getCameraTrends()
    ]);

    if (camerasResult.error) throw camerasResult.error;
    if (rentalsResult.error) throw rentalsResult.error;
    if (usersResult.error) throw usersResult.error;
    if (currentMonthPayments.error) throw currentMonthPayments.error;
    if (lastMonthPayments.error) throw lastMonthPayments.error;

    // Calculate statistics
    const totalCameras = camerasResult.data?.length || 0;
    const activeRentals = rentalsResult.data?.length || 0;
    const totalUsers = usersResult.data?.length || 0;

    // Calculate revenue
    const currentRevenue = currentMonthPayments.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    const lastRevenue = lastMonthPayments.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    
    // Calculate percentage changes
    const revenueChange = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue * 100) : 0;
    
    // Get user growth (users created this month vs last month)
    const currentMonthUsers = usersResult.data?.filter(user => {
      const userDate = new Date(user.created_at);
      return userDate >= startOfMonth && userDate <= endOfMonth;
    }).length || 0;
    
    const lastMonthUsers = usersResult.data?.filter(user => {
      const userDate = new Date(user.created_at);
      return userDate >= startOfLastMonth && userDate <= endOfLastMonth;
    }).length || 0;
    
    const userChange = lastMonthUsers > 0 ? ((currentMonthUsers - lastMonthUsers) / lastMonthUsers * 100) : 0;

    // Get rental growth (rentals created this month vs yesterday)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = yesterday.toISOString().split('T')[0];
    
    const todayRentals = rentalsResult.data?.filter(rental => {
      const rentalDate = new Date(rental.created_at);
      const today = new Date();
      return rentalDate.toDateString() === today.toDateString();
    }).length || 0;
    
    const yesterdayRentals = rentalsResult.data?.filter(rental => {
      const rentalDate = new Date(rental.created_at);
      return rentalDate.toDateString() === yesterday.toDateString();
    }).length || 0;

    return {
      success: true,
      data: {
        totalCameras,
        activeRentals,
        totalUsers,
        revenue: currentRevenue,
        revenueChange,
        userChange,
        rentalChange: todayRentals - yesterdayRentals,
        revenuePerCamera: revenuePerCameraResult.success ? revenuePerCameraResult.data : [],
        cameraTrends: cameraTrendsResult.success ? cameraTrendsResult.data : [],
        totalProfit: currentRevenue // For now, treating revenue as profit
      }
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch dashboard statistics'
    };
  }
}

// Get revenue breakdown per camera model
export async function getRevenuePerCamera() {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        amount,
        payment_status,
        rentals!inner (
          camera_id,
          cameras!inner (
            name,
            id
          )
        )
      `)
      .eq('payment_status', 'verified');

    if (error) throw error;

    // Group revenue by camera model
    const revenueMap = new Map();
    
    data?.forEach(payment => {
      const cameraName = payment.rentals.cameras.name;
      const amount = payment.amount || 0;
      
      if (revenueMap.has(cameraName)) {
        revenueMap.set(cameraName, revenueMap.get(cameraName) + amount);
      } else {
        revenueMap.set(cameraName, amount);
      }
    });

    // Convert to array and sort by revenue
    const revenueData = Array.from(revenueMap.entries())
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10 cameras by revenue

    return {
      success: true,
      data: revenueData
    };
  } catch (error) {
    console.error('Error getting revenue per camera:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

// Get camera booking trends over time
export async function getCameraTrends() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('rentals')
      .select(`
        created_at,
        rental_status,
        cameras!inner (
          name
        )
      `)
      .gte('created_at', thirtyDaysAgoStr)
      .in('rental_status', ['confirmed', 'active', 'completed']);

    if (error) throw error;

    // Group by camera model and count bookings
    const trendsMap = new Map();
    
    data?.forEach(rental => {
      const cameraName = rental.cameras.name;
      
      if (trendsMap.has(cameraName)) {
        trendsMap.set(cameraName, trendsMap.get(cameraName) + 1);
      } else {
        trendsMap.set(cameraName, 1);
      }
    });

    // Convert to array and sort by booking count
    const trendsData = Array.from(trendsMap.entries())
      .map(([name, bookings]) => ({ name, bookings }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 8); // Top 8 most booked cameras

    return {
      success: true,
      data: trendsData
    };
  } catch (error) {
    console.error('Error getting camera trends:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

// Get recent activity for dashboard
export async function getRecentActivity(limit = 5) {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .select(`
        id,
        created_at,
        rental_status,
        cameras!inner (
          name
        ),
        users!inner (
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      success: true,
      data: data || []
    };
  } catch (error) {
    console.error('Error getting recent activity:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}