import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Navigation,
  Radio,
  Truck,
  Bike,
  Car,
  UserCheck,
  UserX,
  Phone,
  MessageSquare,
  Clock,
  MapPin,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { driverService } from '../../services/driver.service';
import { orderService } from '../../services/order.service';
import { useAuthStore } from '../../store/authStore';
import { DriverFleetItem } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { OrderStatus } from '@food-delivery/shared';

export const DispatchMapPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { restaurant } = useAuthStore();
  const restaurantId = restaurant?.id || 'all';

  const [selectedDriver, setSelectedDriver] = useState<DriverFleetItem | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'AVAILABLE' | 'BUSY' | 'OFFLINE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [assigningOrder, setAssigningOrder] = useState<any | null>(null);
  const [targetDriverId, setTargetDriverId] = useState<string>('');
  const [dispatchPayout, setDispatchPayout] = useState<string>('6.50');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState('');

  // 1. Fetch live fleet with 5s auto-refresh
  const {
    data: fleet = [],
    isLoading: isLoadingFleet,
    isFetching: isFetchingFleet,
    refetch: refetchFleet,
  } = useQuery({
    queryKey: ['dispatchFleet'],
    queryFn: () => driverService.getFleet(),
    refetchInterval: 5000,
  });

  // 2. Fetch active orders that might need assignment
  const {
    data: ordersData,
    isLoading: isLoadingOrders,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['dispatchOrders', restaurantId],
    queryFn: () =>
      orderService.getRestaurantOrders(restaurantId, {
        limit: 25,
      }),
    refetchInterval: 5000,
  });

  const orders = ordersData?.items || [];

  // Filter orders needing dispatch assignment (READY_FOR_PICKUP, RESTAURANT_ACCEPTED, or PREPARING)
  const unassignedOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        (o.status === OrderStatus.READY_FOR_PICKUP ||
          o.status === OrderStatus.RESTAURANT_ACCEPTED ||
          o.status === OrderStatus.PREPARING) &&
        !(o as any).driverId &&
        !(o as any).deliveryAssignment?.driver
    );
  }, [orders]);

  // Filter drivers
  const filteredFleet = useMemo(() => {
    return fleet.filter((d) => {
      const name = d.user?.name?.toLowerCase() || '';
      const plate = d.licensePlate?.toLowerCase() || '';
      const matchesSearch = name.includes(searchQuery.toLowerCase()) || plate.includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filterMode === 'AVAILABLE') return d.isOnline && !d.activeAssignment;
      if (filterMode === 'BUSY') return d.isOnline && !!d.activeAssignment;
      if (filterMode === 'OFFLINE') return !d.isOnline;
      return true;
    });
  }, [fleet, filterMode, searchQuery]);

  const onlineCount = fleet.filter((d) => d.isOnline).length;
  const busyCount = fleet.filter((d) => d.isOnline && d.activeAssignment).length;
  const availableCount = onlineCount - busyCount;

  // Handle manual dispatch
  const handleAssignDispatch = async () => {
    if (!assigningOrder || !targetDriverId) return;
    setIsAssigning(true);
    setAssignSuccess('');
    try {
      await driverService.dispatchAssign(
        assigningOrder.id,
        targetDriverId,
        parseFloat(dispatchPayout) || 5.0
      );
      setAssignSuccess(`Order #${assigningOrder.orderNumber} successfully dispatched!`);
      setTimeout(() => {
        setAssigningOrder(null);
        setAssignSuccess('');
        queryClient.invalidateQueries({ queryKey: ['dispatchFleet'] });
        queryClient.invalidateQueries({ queryKey: ['dispatchOrders'] });
      }, 1200);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Dispatch assignment failed');
    } finally {
      setIsAssigning(false);
    }
  };

  // Helper coordinate mapper for radar view (normalized to 1000x600 viewBox)
  // Base center lat/lng (defaults around typical coordinates or 40.7128 / -74.0060)
  const centerLat = 40.7128;
  const centerLng = -74.006;
  const scale = 3200; // zoom factor for coordinate displacement

  const getDriverPos = (d: DriverFleetItem, index: number) => {
    // If real GPS coordinates exist, use displacement; otherwise spread nicely around center
    if (d.currentLatitude && d.currentLongitude) {
      const x = 500 + (d.currentLongitude - centerLng) * scale;
      const y = 300 - (d.currentLatitude - centerLat) * scale;
      // Clamped within radar viewBox bounds
      return {
        x: Math.max(80, Math.min(920, x)),
        y: Math.max(60, Math.min(540, y)),
      };
    }
    // Deterministic procedural ring layout for testing/mocking
    const angle = (index / (fleet.length || 1)) * 2 * Math.PI;
    const radius = 140 + (index % 3) * 60;
    return {
      x: 500 + Math.cos(angle) * radius,
      y: 300 + Math.sin(angle) * (radius * 0.75),
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Stat Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  GPS Fleet Dispatch & Radar
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Live GPS 5s
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Real-time courier fleet tracking, telemetry telemetry, and 1-click manual order dispatch.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/50 rounded-xl text-center">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block">Available Couriers</span>
            <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">{availableCount}</span>
          </div>
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 rounded-xl text-center">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 block">Active Trips</span>
            <span className="text-lg font-black text-blue-700 dark:text-blue-300">{busyCount}</span>
          </div>
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-xl text-center">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block">Unassigned Orders</span>
            <span className="text-lg font-black text-amber-700 dark:text-amber-300">{unassignedOrders.length}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchFleet();
              refetchOrders();
            }}
            disabled={isFetchingFleet}
            className="flex items-center gap-1.5 h-11"
          >
            <RefreshCw className={`w-4 h-4 ${isFetchingFleet ? 'animate-spin text-brand-500' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Grid: Interactive Radar Map (Left 7/12) + Dispatch Panel (Right 5/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar Map Canvas */}
        <div className="lg:col-span-8 bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden relative flex flex-col min-h-[580px]">
          {/* Radar Map Overlay Controls */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-slate-800 p-1.5 rounded-xl text-xs text-slate-300 shadow-md">
            <span className="px-2 font-mono font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              RADAR ACTIVE
            </span>
            <span className="text-slate-600">|</span>
            <span className="px-2 text-slate-400 font-mono">GRID: 5KM DISPATCH RADIUS</span>
          </div>

          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <button
              onClick={() => setSelectedDriver(null)}
              className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-800 transition-colors"
            >
              Reset Focus
            </button>
          </div>

          {/* SVG Vector Interactive Radar */}
          <div className="flex-1 w-full relative flex items-center justify-center p-4">
            <svg
              viewBox="0 0 1000 600"
              className="w-full h-full select-none"
              style={{ minHeight: '520px' }}
            >
              <defs>
                {/* Radar Grid Pattern */}
                <pattern id="radarGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.75" />
                </pattern>
                {/* Radial Glow */}
                <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Background Grid */}
              <rect width="1000" height="600" fill="#020617" />
              <rect width="1000" height="600" fill="url(#radarGrid)" />
              <circle cx="500" cy="300" r="260" fill="url(#centerGlow)" />

              {/* Concentric Range Rings */}
              <circle cx="500" cy="300" r="80" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="500" cy="300" r="160" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="500" cy="300" r="240" fill="none" stroke="#1e293b" strokeWidth="1.5" />
              
              {/* Distance labels */}
              <text x="505" y="215" fill="#64748b" fontSize="10" fontFamily="monospace">1.5 km</text>
              <text x="505" y="135" fill="#64748b" fontSize="10" fontFamily="monospace">3.0 km</text>
              <text x="505" y="55" fill="#64748b" fontSize="10" fontFamily="monospace">5.0 km</text>

              {/* Crosshair Axes */}
              <line x1="500" y1="20" x2="500" y2="580" stroke="#1e293b" strokeWidth="1" />
              <line x1="50" y1="300" x2="950" y2="300" stroke="#1e293b" strokeWidth="1" />

              {/* Central Store Hub Pin */}
              <g transform="translate(500, 300)">
                <circle r="22" fill="#ef4444" fillOpacity="0.2" className="animate-ping" />
                <circle r="12" fill="#ef4444" />
                <circle r="4" fill="#ffffff" />
                <text x="16" y="4" fill="#f87171" fontSize="12" fontWeight="bold">
                  STORE HUB
                </text>
              </g>

              {/* Driver Courier Nodes */}
              {fleet.map((driver, index) => {
                const pos = getDriverPos(driver, index);
                const isSelected = selectedDriver?.id === driver.id;
                const isOnline = driver.isOnline;
                const isBusy = !!driver.activeAssignment;

                let nodeColor = isOnline ? (isBusy ? '#3b82f6' : '#10b981') : '#64748b';
                let vehicleIcon = driver.vehicleType === 'BICYCLE' ? '🚲' : driver.vehicleType === 'MOTORCYCLE' ? '🛵' : '🚗';

                return (
                  <g
                    key={driver.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => setSelectedDriver(driver)}
                    className="cursor-pointer transition-all duration-300"
                  >
                    {/* Pulsing ring if available */}
                    {isOnline && !isBusy && (
                      <circle r="20" fill={nodeColor} fillOpacity="0.25" className="animate-pulse" />
                    )}

                    {/* Active route trajectory line to Store if busy */}
                    {isBusy && (
                      <line
                        x1="0"
                        y1="0"
                        x2={500 - pos.x}
                        y2={300 - pos.y}
                        stroke="#3b82f6"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        strokeOpacity="0.6"
                      />
                    )}

                    {/* Marker circle */}
                    <circle
                      r={isSelected ? 16 : 13}
                      fill={nodeColor}
                      stroke={isSelected ? '#ffffff' : '#0f172a'}
                      strokeWidth={isSelected ? 3 : 2}
                    />

                    {/* Emoji Vehicle Symbol */}
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fontSize="10"
                      fill="#ffffff"
                      pointerEvents="none"
                    >
                      {vehicleIcon}
                    </text>

                    {/* Label Badge */}
                    <g transform="translate(0, 24)">
                      <rect
                        x="-45"
                        y="-8"
                        width="90"
                        height="16"
                        rx="4"
                        fill="#0f172a"
                        stroke={nodeColor}
                        strokeWidth="0.75"
                        fillOpacity="0.9"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill="#e2e8f0"
                        fontSize="9"
                        fontWeight="bold"
                        pointerEvents="none"
                      >
                        {driver.user?.name?.split(' ')[0] || 'Courier'}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Selected Courier Detail Bottom Overlay */}
          {selectedDriver && (
            <div className="p-4 bg-slate-900/95 backdrop-blur border-t border-slate-800 text-white flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-emerald-400">
                  {selectedDriver.user?.name?.slice(0, 2).toUpperCase() || 'CO'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">
                      {selectedDriver.user?.name || 'Courier Driver'}
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        selectedDriver.isOnline
                          ? selectedDriver.activeAssignment
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {selectedDriver.isOnline
                        ? selectedDriver.activeAssignment
                          ? 'ON DELIVERY'
                          : 'READY & AVAILABLE'
                        : 'OFFLINE'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{selectedDriver.vehicleType}</span>
                    <span>•</span>
                    <span>Plate: {selectedDriver.licensePlate || 'N/A'}</span>
                    <span>•</span>
                    <span>★ {selectedDriver.ratingAverage?.toFixed(1) || '5.0'}</span>
                    <span>•</span>
                    <span>{selectedDriver.totalDeliveries} trips completed</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedDriver.user?.phone && (
                  <a
                    href={`tel:${selectedDriver.user.phone}`}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    Call
                  </a>
                )}
                {selectedDriver.activeAssignment && (
                  <button
                    onClick={() =>
                      navigate(`/messages?orderId=${selectedDriver.activeAssignment?.orderId}`)
                    }
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Order Chat #{selectedDriver.activeAssignment.orderNumber}
                  </button>
                )}
                <button
                  onClick={() => setSelectedDriver(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Ready Orders Queue & Couriers Directory */}
        <div className="lg:col-span-4 space-y-6">
          {/* Section 1: Orders Requiring Dispatch */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4" />
                </div>
                <h2 className="font-extrabold text-base text-gray-900 dark:text-white">
                  Ready for Dispatch
                </h2>
              </div>
              <Badge variant="warning">{unassignedOrders.length} pending</Badge>
            </div>

            {unassignedOrders.length === 0 ? (
              <div className="text-center py-8 px-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-700 dark:text-slate-300">All Orders Dispatched!</p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
                  No active orders are waiting for courier pickup at this moment.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {unassignedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-3.5 bg-gray-50 dark:bg-slate-800/80 hover:bg-brand-50/50 dark:hover:bg-slate-700/80 rounded-xl border border-gray-200/80 dark:border-slate-700 transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-gray-900 dark:text-white">
                          #{order.orderNumber}
                        </span>
                        <Badge variant="info">
                          {order.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-slate-300 mt-1 font-medium">
                        {(order as any).customer?.name || (order as any).customerName || 'Customer'} • $
                        {Number(order.totalAmount || 0).toFixed(2)}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(order.placedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        setAssigningOrder(order);
                        const available = fleet.find((d) => d.isOnline && !d.activeAssignment);
                        if (available) setTargetDriverId(available.id);
                      }}
                      className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs"
                    >
                      Dispatch
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Courier Fleet Directory & Status */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-extrabold text-base text-gray-900 dark:text-white">Couriers ({fleet.length})</h2>
              {/* Filter tabs */}
              <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-bold text-gray-600 dark:text-slate-400">
                <button
                  onClick={() => setFilterMode('ALL')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    filterMode === 'ALL' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : ''
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterMode('AVAILABLE')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    filterMode === 'AVAILABLE' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm' : ''
                  }`}
                >
                  Ready
                </button>
                <button
                  onClick={() => setFilterMode('BUSY')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    filterMode === 'BUSY' ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-sm' : ''
                  }`}
                >
                  Busy
                </button>
              </div>
            </div>

            {/* Courier Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search driver by name or plate..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Courier List */}
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {filteredFleet.map((d) => {
                const isSelected = selectedDriver?.id === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDriver(d)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/30 ring-1 ring-brand-500'
                        : 'border-gray-200/80 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/70 hover:bg-gray-100/70 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 flex items-center justify-center font-bold text-xs text-gray-800 dark:text-slate-200 shadow-sm">
                          {d.user?.name ? d.user.name.slice(0, 2).toUpperCase() : 'DR'}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                            d.isOnline
                              ? d.activeAssignment
                                ? 'bg-blue-500'
                                : 'bg-emerald-500'
                              : 'bg-gray-400'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                          {d.user?.name || 'Courier Driver'}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                          {d.vehicleType} • {d.licensePlate || 'Plate N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          d.isOnline
                            ? d.activeAssignment
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                        }`}
                      >
                        {d.isOnline
                          ? d.activeAssignment
                            ? 'Delivering'
                            : 'Available'
                          : 'Offline'}
                      </span>
                      <p className="text-[10px] text-gray-400 dark:text-slate-500 font-semibold mt-1">
                        ★ {d.ratingAverage?.toFixed(1) || '5.0'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Dispatch Modal */}
      {assigningOrder && (
        <Modal
          isOpen={true}
          onClose={() => setAssigningOrder(null)}
          title={`Manual Dispatch: Order #${assigningOrder.orderNumber}`}
        >
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-gray-900 dark:text-white">Destination Customer:</span>
                <span className="font-semibold text-gray-700 dark:text-slate-300">
                  {(assigningOrder as any).customer?.name || (assigningOrder as any).customerName || 'Customer'}
                </span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-gray-900 dark:text-white">Delivery Address:</span>
                <span className="text-gray-600 dark:text-slate-400 truncate max-w-[220px]">
                  {typeof assigningOrder.deliveryAddress === 'object'
                    ? assigningOrder.deliveryAddress?.street || 'Standard Delivery'
                    : assigningOrder.deliveryAddress || 'Standard Delivery'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900 dark:text-white">Order Subtotal:</span>
                <span className="font-black text-brand-600 dark:text-brand-400">
                  ${Number(assigningOrder.totalAmount || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {assignSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {assignSuccess}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Assign to Courier Driver
              </label>
              <select
                value={targetDriverId}
                onChange={(e) => setTargetDriverId(e.target.value)}
                className="w-full text-xs font-medium bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-2.5 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">-- Choose Courier --</option>
                {fleet.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.user?.name || 'Courier'} ({d.vehicleType}) -{' '}
                    {d.isOnline ? (d.activeAssignment ? 'Busy' : 'Available') : 'Offline'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Courier Payout Bonus ($)
              </label>
              <input
                type="number"
                step="0.50"
                value={dispatchPayout}
                onChange={(e) => setDispatchPayout(e.target.value)}
                className="w-full text-xs font-semibold bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-2.5 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="5.00"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
              <Button variant="outline" onClick={() => setAssigningOrder(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleAssignDispatch}
                disabled={!targetDriverId || isAssigning}
                className="bg-brand-500 hover:bg-brand-600 text-white font-bold"
              >
                {isAssigning ? 'Dispatching...' : 'Confirm Dispatch'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
