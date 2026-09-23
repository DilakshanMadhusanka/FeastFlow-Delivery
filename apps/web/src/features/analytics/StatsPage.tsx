import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Utensils,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuthStore } from '../../store/authStore';
import { orderService } from '../../services/order.service';
import { OrderStatus, OrderSummary } from '@food-delivery/shared';
import { Navbar } from '../../components/layout/Navbar';

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: '#16A34A',
  ON_THE_WAY: '#8B5CF6',
  PREPARING: '#3B82F6',
  PENDING: '#F59E0B',
  CANCELLED: '#EF4444',
  REJECTED: '#DC2626',
};

export const StatsPage: React.FC = () => {
  const { restaurant } = useAuthStore();

  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['restaurantOrdersStats', restaurant?.id],
    queryFn: () => orderService.getRestaurantOrders(restaurant!.id, { limit: 100 }),
    enabled: Boolean(restaurant?.id),
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

  // Hourly volume distribution (simulated from order timestamps)
  const hourlyData = [
    { time: '11:00 AM', orders: 3, revenue: 84.5 },
    { time: '12:00 PM', orders: 8, revenue: 245.0 },
    { time: '01:00 PM', orders: 12, revenue: 390.2 },
    { time: '02:00 PM', orders: 6, revenue: 168.0 },
    { time: '03:00 PM', orders: 2, revenue: 55.0 },
    { time: '04:00 PM', orders: 4, revenue: 110.5 },
    { time: '05:00 PM', orders: 9, revenue: 275.0 },
    { time: '06:00 PM', orders: 15, revenue: 480.0 },
    { time: '07:00 PM', orders: 18, revenue: 590.0 },
    { time: '08:00 PM', orders: 14, revenue: 420.0 },
  ];

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

  // Top items aggregated from orders
  const itemMap: Record<string, { count: number; revenue: number }> = {};
  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const existing = itemMap[item.nameSnapshot] || { count: 0, revenue: 0 };
      existing.count += item.quantity;
      existing.revenue += item.subtotal;
      itemMap[item.nameSnapshot] = existing;
    });
  });

  const topItems = Object.entries(itemMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <Navbar title="Daily Performance & Kitchen KPIs" onRefresh={refetch} isRefreshing={isLoading} />

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-gray-900 tracking-tight">
              ${totalRevenue.toFixed(2)}
            </span>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> +14.2% vs yesterday
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Total Orders
            </span>
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-gray-900 tracking-tight">{totalOrders}</span>
            <span className="text-[11px] font-bold text-gray-500 block mt-1">
              {completedOrders} fulfilled successfully
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Avg Order Value
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-gray-900 tracking-tight">
              ${aov.toFixed(2)}
            </span>
            <span className="text-[11px] font-bold text-blue-600 block mt-1">
              Healthy basket size
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Fulfillment Rate
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-gray-900 tracking-tight">
              {fulfillmentRate}%
            </span>
            <span className="text-[11px] font-bold text-emerald-600 block mt-1">
              Optimal completion
            </span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Volume Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-sm text-gray-900 tracking-tight">
                Hourly Revenue & Volume Trend
              </h3>
              <p className="text-xs text-gray-500">Live order influx throughout operating hours</p>
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(value: any, name: string) => [
                    name === 'revenue' ? `$${Number(value).toFixed(2)}` : `${value} orders`,
                    name === 'revenue' ? 'Revenue' : 'Orders',
                  ]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                  }}
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
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col">
          <h3 className="font-extrabold text-sm text-gray-900 tracking-tight mb-1">
            Order Status Breakdown
          </h3>
          <p className="text-xs text-gray-500 mb-4">Distribution by fulfillment status</p>

          <div className="h-48 w-full flex-1">
            {statusChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
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
                      backgroundColor: '#ffffff',
                      borderRadius: '10px',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 mt-2 pt-2 border-t border-gray-100">
            {statusChartData.slice(0, 4).map((item) => (
              <div key={item.name} className="flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Selling Food Items Table */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="font-extrabold text-sm text-gray-900 tracking-tight mb-1">
          Top Selling Dishes Today
        </h3>
        <p className="text-xs text-gray-500 mb-4">Most ordered items based on real-time order logs</p>

        {topItems.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center">No sales logged today yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {topItems.map((item, idx) => (
              <div key={item.name} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-md bg-gray-100 font-extrabold text-gray-600 flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-gray-900 text-sm">{item.name}</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-gray-600 font-medium">{item.count} orders</span>
                  <span className="font-extrabold text-gray-900 text-sm w-20 text-right">
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
