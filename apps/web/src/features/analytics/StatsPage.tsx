import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Utensils,
  Store,
  Building2,
  Filter,
  ChevronRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuthStore } from '../../store/authStore';
import { orderService } from '../../services/order.service';
import { OrderStatus, OrderSummary, UserRole } from '@food-delivery/shared';
import { Navbar } from '../../components/layout/Navbar';

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: '#16A34A',
  OUT_FOR_DELIVERY: '#8B5CF6',
  READY_FOR_PICKUP: '#6366F1',
  PREPARING: '#3B82F6',
  RESTAURANT_ACCEPTED: '#0EA5E9',
  PENDING: '#F59E0B',
  CANCELLED: '#EF4444',
  REJECTED: '#DC2626',
};

export const StatsPage: React.FC = () => {
  const { restaurant, restaurants, setRestaurant, user } = useAuthStore();
  const isAdmin = Boolean(
    user?.roles?.includes(UserRole.ADMIN) || user?.roles?.includes('ADMIN' as any)
  );

  // System admin defaults to 'ALL' to display stats of all restaurants
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() =>
    isAdmin ? 'ALL' : restaurant?.id || 'ALL'
  );

  useEffect(() => {
    if (isAdmin) {
      setSelectedBranchId('ALL');
    } else if (restaurant?.id && selectedBranchId === 'ALL') {
      setSelectedBranchId(restaurant.id);
    }
  }, [isAdmin, restaurant?.id]);

  const isViewingAll = selectedBranchId === 'ALL';
  const targetRestaurantId = isViewingAll ? 'all' : selectedBranchId;

  const currentBranchName = isViewingAll
    ? 'All Restaurants (Platform Wide)'
    : restaurants.find((r) => r.id === selectedBranchId)?.name ||
      restaurant?.name ||
      'My Restaurant';

  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['restaurantOrdersStats', targetRestaurantId],
    queryFn: () => orderService.getRestaurantOrders(targetRestaurantId, { limit: 100 }),
    enabled: Boolean(targetRestaurantId),
    staleTime: 30 * 1000,
  });

  const orders: OrderSummary[] = ordersData?.items || [];

  // Compute metrics
  const nonCancelledOrders = orders.filter(
    (o) => o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.REJECTED
  );

  const totalRevenue = nonCancelledOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalOrders = orders.length;
  const aov = nonCancelledOrders.length > 0 ? totalRevenue / nonCancelledOrders.length : 0;
  const completedOrders = orders.filter((o) => o.status === OrderStatus.DELIVERED).length;
  const fulfillmentRate =
    totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 100;

  // Real hourly volume & revenue trend
  const operatingHours = [
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '01:00 PM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM',
    '05:00 PM',
    '06:00 PM',
    '07:00 PM',
    '08:00 PM',
    '09:00 PM',
    '10:00 PM',
  ];

  const hourlyMap: Record<string, { orders: number; revenue: number }> = {};
  operatingHours.forEach((time) => {
    hourlyMap[time] = { orders: 0, revenue: 0 };
  });

  orders.forEach((o) => {
    if (!o.placedAt) return;
    const d = new Date(o.placedAt);
    if (isNaN(d.getTime())) return;
    let hour = d.getHours();
    const ampm = hour >= 12 ? 'PM' : 'AM';
    let displayHour = hour % 12;
    if (displayHour === 0) displayHour = 12;
    const timeKey = `${displayHour < 10 ? '0' + displayHour : displayHour}:00 ${ampm}`;
    if (hourlyMap[timeKey]) {
      hourlyMap[timeKey].orders += 1;
      if (o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.REJECTED) {
        hourlyMap[timeKey].revenue += o.totalAmount;
      }
    }
  });

  const hasHourlyActivity = Object.values(hourlyMap).some((h) => h.orders > 0);
  const hourlyData = operatingHours.map((time) => ({
    time,
    orders: hasHourlyActivity ? hourlyMap[time].orders : 0,
    revenue: hasHourlyActivity ? Number(hourlyMap[time].revenue.toFixed(2)) : 0,
  }));

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  orders.forEach((o) => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });

  const statusChartData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.replace(/_/g, ' '),
    value: count,
    color: STATUS_COLORS[status] || '#6B7280',
  }));

  // Top items aggregated from orders with restaurant attribution
  const itemMap: Record<
    string,
    { name: string; restaurantName?: string; count: number; revenue: number }
  > = {};
  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const key = `${item.nameSnapshot}__${order.restaurant?.name || ''}`;
      if (!itemMap[key]) {
        itemMap[key] = {
          name: item.nameSnapshot,
          restaurantName: order.restaurant?.name,
          count: 0,
          revenue: 0,
        };
      }
      itemMap[key].count += item.quantity;
      itemMap[key].revenue += item.subtotal;
    });
  });

  const topItems = Object.values(itemMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Platform-Wide Restaurant Breakdown (When viewing all restaurants)
  const allKnownRestaurantsMap = new Map<
    string,
    { id: string; name: string; city: string; street?: string }
  >();
  restaurants.forEach((r) => {
    allKnownRestaurantsMap.set(r.id, {
      id: r.id,
      name: r.name,
      city: r.city,
      street: r.street,
    });
  });
  orders.forEach((o) => {
    if (o.restaurant && !allKnownRestaurantsMap.has(o.restaurant.id)) {
      allKnownRestaurantsMap.set(o.restaurant.id, {
        id: o.restaurant.id,
        name: o.restaurant.name,
        city: o.restaurant.city || 'Platform',
        street: o.restaurant.street || '',
      });
    }
  });
  const allKnownRestaurants = Array.from(allKnownRestaurantsMap.values());

  const restaurantBreakdown = allKnownRestaurants.map((r) => {
    const restOrders = orders.filter(
      (o) => o.restaurantId === r.id || o.restaurant?.id === r.id
    );
    const restNonCancelled = restOrders.filter(
      (o) => o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.REJECTED
    );
    const revenue = restNonCancelled.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalCount = restOrders.length;
    const restAov = restNonCancelled.length > 0 ? revenue / restNonCancelled.length : 0;
    const completed = restOrders.filter((o) => o.status === OrderStatus.DELIVERED).length;
    const fulfillment = totalCount > 0 ? Math.round((completed / totalCount) * 100) : 100;
    const activeOrders = restOrders.filter((o) =>
      [
        OrderStatus.PENDING,
        OrderStatus.RESTAURANT_ACCEPTED,
        OrderStatus.PREPARING,
        OrderStatus.READY_FOR_PICKUP,
        OrderStatus.DRIVER_ASSIGNED,
        OrderStatus.PICKED_UP,
        OrderStatus.ON_THE_WAY,
      ].includes(o.status)
    ).length;

    return {
      id: r.id,
      name: r.name,
      city: r.city,
      street: r.street,
      totalOrders: totalCount,
      revenue,
      aov: restAov,
      completed,
      fulfillment,
      activeOrders,
    };
  });

  return (
    <div className="space-y-6">
      <Navbar
        title={`${currentBranchName} • Daily Stats & KPIs`}
        onRefresh={refetch}
        isRefreshing={isLoading}
      />

      {/* Quick Branch Filter Bar */}
      {(restaurants.length > 1 || isAdmin) && (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4 overflow-hidden">
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            <div className="flex items-center gap-1.5 px-2.5 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
              <Store className="w-3.5 h-3.5 text-brand-500" />
              <span>Scope:</span>
            </div>

            {isAdmin && (
              <button
                onClick={() => setSelectedBranchId('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  isViewingAll
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                    : 'bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200/60 dark:border-slate-700'
                }`}
              >
                <span>🌐 All Restaurants (Platform Wide)</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    isViewingAll ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                  }`}
                >
                  Platform
                </span>
              </button>
            )}

            {restaurants.map((r) => {
              const isSelected = !isViewingAll && selectedBranchId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedBranchId(r.id);
                    setRestaurant(r);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                    isSelected
                      ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                      : 'bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200/60 dark:border-slate-700'
                  }`}
                >
                  <span>{r.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                    }`}
                  >
                    {r.city}
                  </span>
                </button>
              );
            })}
          </div>

          {isViewingAll && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400 shrink-0 pr-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Platform Aggregated Data</span>
            </div>
          )}
        </div>
      )}

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              {isViewingAll ? 'Total Platform Revenue' : 'Total Revenue'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              ${totalRevenue.toFixed(2)}
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> Gross sales from valid orders
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              {isViewingAll ? 'Total Platform Orders' : 'Total Orders'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{totalOrders}</span>
            <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mt-1">
              {completedOrders} fulfilled successfully
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              Avg Order Value
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              ${aov.toFixed(2)}
            </span>
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block mt-1">
              Average basket size
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              Fulfillment Rate
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {fulfillmentRate}%
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block mt-1">
              Optimal order completion
            </span>
          </div>
        </div>
      </div>

      {/* Platform-Wide Restaurant Performance Comparison (Admin View) */}
      {isViewingAll && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-500" />
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white tracking-tight">
                  Restaurant Performance Breakdown
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Comparison of revenue, order volume, and fulfillment efficiency across all branches
              </p>
            </div>
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg self-start sm:self-auto">
              {allKnownRestaurants.length} Registered Restaurants
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/75 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-800 text-gray-400 dark:text-slate-400 font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Restaurant</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4 text-center">Orders</th>
                  <th className="py-3 px-4 text-center">Active</th>
                  <th className="py-3 px-4">Gross Revenue</th>
                  <th className="py-3 px-4">Avg Order Value</th>
                  <th className="py-3 px-4">Fulfillment Rate</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {restaurantBreakdown.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-extrabold text-gray-900 dark:text-white text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {r.name.slice(0, 1)}
                        </div>
                        <div>
                          <p>{r.name}</p>
                          <p className="text-[10px] text-gray-400 dark:text-slate-500 font-normal">{r.street}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-600 dark:text-slate-300">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-[11px] font-bold">
                        {r.city}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-sm text-gray-900 dark:text-white">
                      {r.totalOrders}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {r.activeOrders > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-bold text-[11px]">
                          {r.activeOrders} active
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-500 text-[11px]">0 active</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-black text-sm text-gray-900 dark:text-white">
                      ${r.revenue.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-700 dark:text-slate-300">
                      ${r.aov.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-2 rounded-full transition-all"
                            style={{ width: `${r.fulfillment}%` }}
                          />
                        </div>
                        <span className="font-bold text-xs text-gray-800 dark:text-slate-200">{r.fulfillment}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedBranchId(r.id);
                          const found = restaurants.find((item) => item.id === r.id);
                          if (found) setRestaurant(found);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <span>Filter Branch</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Volume Area Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white tracking-tight">
                {isViewingAll
                  ? 'Platform-Wide Hourly Revenue & Volume Trend'
                  : 'Hourly Revenue & Volume Trend'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Live order influx throughout operating hours</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff4b3a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ff4b3a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(value: any, name: string) => [
                    name === 'revenue' ? `$${Number(value).toFixed(2)}` : `${value} orders`,
                    name === 'revenue' ? 'Revenue' : 'Orders',
                  ]}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#ff4b3a"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col">
          <h3 className="font-extrabold text-sm text-gray-900 dark:text-white tracking-tight mb-1">
            Order Status Breakdown
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">Distribution by fulfillment status</p>

          <div className="h-48 w-full flex-1">
            {statusChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400 dark:text-slate-500">
                No orders data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '10px',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '11px',
                    }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 mt-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            {statusChartData.slice(0, 4).map((item) => (
              <div key={item.name} className="flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.name}
                </span>
                <span className="text-gray-900 dark:text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Selling Food Items Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm">
        <h3 className="font-extrabold text-sm text-gray-900 dark:text-white tracking-tight mb-1">
          Top Selling Dishes Today
        </h3>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
          Most ordered items based on real-time order logs
        </p>

        {topItems.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-slate-500 py-6 text-center">No sales logged today yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {topItems.map((item, idx) => (
              <div key={item.name + idx} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-md bg-gray-100 dark:bg-slate-800 font-extrabold text-gray-600 dark:text-slate-300 flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white text-sm">{item.name}</span>
                      {isViewingAll && item.restaurantName && (
                        <span className="text-[10px] font-bold bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-200/80 dark:border-orange-800 px-2 py-0.5 rounded-md shrink-0">
                          {item.restaurantName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-gray-600 dark:text-slate-300 font-medium">{item.count} orders</span>
                  <span className="font-extrabold text-gray-900 dark:text-white text-sm w-20 text-right">
                    ${Number(item.revenue || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
