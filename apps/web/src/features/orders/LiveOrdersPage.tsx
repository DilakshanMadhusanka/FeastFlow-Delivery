import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag,
  Clock,
  Utensils,
  CheckCircle2,
  Bike,
  XCircle,
  Eye,
  AlertCircle,
  Phone,
  MapPin,
  Receipt,
  Check,
  X,
  CreditCard,
  Banknote,
  Radio,
  ArrowRight,
  Store,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { orderService } from '../../services/order.service';
import { socketService } from '../../services/socket.service';
import { OrderStatus, OrderSummary, UserRole } from '@food-delivery/shared';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Navbar } from '../../components/layout/Navbar';

export const LiveOrdersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { restaurant, restaurants, setRestaurant, user } = useAuthStore();
  const isAdmin = Boolean(
    user?.roles?.includes(UserRole.ADMIN) || user?.roles?.includes('ADMIN' as any)
  );

  // System admin default view scope is 'ALL' to display order details of all restaurants
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
  const queryRestaurantId = isViewingAll ? 'all' : selectedBranchId;

  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [crossBranchAlert, setCrossBranchAlert] = useState<{
    orderNumber: string;
    restaurantId: string;
    restaurantName: string;
  } | null>(null);

  // Web Audio synth chime for incoming orders
  const playAlertChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // AudioContext policy
    }
  };

  // Real-time socket event subscription for kitchen terminal
  useEffect(() => {
    const socket = socketService.connect();
    setIsSocketConnected(socket.connected);

    const onConnect = () => {
      setIsSocketConnected(true);
      if (restaurant?.id && restaurant.id !== 'all') {
        socketService.joinRestaurant(restaurant.id);
      }
    };
    const onDisconnect = () => setIsSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (restaurant?.id && restaurant.id !== 'all') {
      socketService.joinRestaurant(restaurant.id);
    }

    const unsubNewOrder = socketService.onNewOrder((newOrder) => {
      console.log(
        '⚡ Real-time new order received on KDS:',
        newOrder.orderNumber,
        'for restaurant:',
        newOrder.restaurantId
      );
      playAlertChime();
      // Invalidate all restaurant orders to force fresh fetch
      queryClient.invalidateQueries({ queryKey: ['restaurantOrders'] });

      // If user is currently filtered to a single restaurant that is NOT this order's restaurant, notify
      if (!isViewingAll && newOrder.restaurantId !== selectedBranchId) {
        const targetRest = restaurants.find((r) => r.id === newOrder.restaurantId);
        setCrossBranchAlert({
          orderNumber: newOrder.orderNumber,
          restaurantId: newOrder.restaurantId,
          restaurantName: targetRest?.name || 'Another Branch',
        });
      }
    });

    const unsubStatus = socketService.onOrderStatusChanged((event) => {
      console.log('⚡ Real-time order status transition on KDS:', event.orderNumber, event.newStatus);
      queryClient.invalidateQueries({ queryKey: ['restaurantOrders'] });
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      unsubNewOrder();
      unsubStatus();
      if (restaurant?.id && restaurant.id !== 'all') {
        socketService.leaveRestaurant(restaurant.id);
      }
    };
  }, [restaurant?.id, isViewingAll, selectedBranchId, restaurants, queryClient]);

  // Live kitchen orders query (real-time updates pushed via Socket.IO with continuous 3s polling backup)
  const {
    data: ordersData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['restaurantOrders', queryRestaurantId],
    queryFn: () => orderService.getRestaurantOrders(queryRestaurantId, { limit: 100 }),
    enabled: Boolean(isViewingAll || selectedBranchId || restaurant?.id),
    staleTime: 2000,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status, notes }: { orderId: string; status: OrderStatus; notes?: string }) =>
      orderService.updateOrderStatus(orderId, status, notes),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['restaurantOrders', restaurant?.id] });
      if (selectedOrder && selectedOrder.id === updated.id) {
        setSelectedOrder(updated);
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      orderService.cancelOrder(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantOrders', restaurant?.id] });
      setShowDeclineModal(false);
      setSelectedOrder(null);
      setDeclineReason('');
    },
  });

  const orders = ordersData?.items || [];

  // Group orders into Kitchen Kanban columns
  const pendingOrders = orders.filter((o) => o.status === OrderStatus.PENDING);
  const inKitchenOrders = orders.filter(
    (o) => o.status === OrderStatus.RESTAURANT_ACCEPTED || o.status === OrderStatus.PREPARING
  );
  const readyOrders = orders.filter(
    (o) => o.status === OrderStatus.READY_FOR_PICKUP || o.status === OrderStatus.DRIVER_ASSIGNED
  );
  const outOrDeliveredOrders = orders.filter(
    (o) =>
      o.status === OrderStatus.PICKED_UP ||
      o.status === OrderStatus.ON_THE_WAY ||
      o.status === OrderStatus.DELIVERED
  );

  const handleStatusChange = (orderId: string, status: OrderStatus, notes?: string) => {
    updateStatusMutation.mutate({ orderId, status, notes });
  };

  const formatElapsed = (placedAt: string) => {
    const elapsedMinutes = Math.floor((Date.now() - new Date(placedAt).getTime()) / 60000);
    if (elapsedMinutes < 1) return 'Just now';
    if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
    return `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m ago`;
  };

  const currentBranchName = isViewingAll
    ? 'All Restaurants (Platform Wide)'
    : restaurants.find((r) => r.id === selectedBranchId)?.name || restaurant?.name || 'Kitchen';

  if (!restaurant && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <StoreUnavailable />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Navbar
        title={`${currentBranchName} • Kitchen Display System`}
        onRefresh={refetch}
        isRefreshing={isRefetching}
      />

      {/* Cross-Branch Alert Banner */}
      {crossBranchAlert && (
        <div className="bg-amber-500 text-white px-5 py-3.5 rounded-2xl shadow-lg flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="font-extrabold text-sm">
                New Order #{crossBranchAlert.orderNumber} received for{' '}
                <span className="underline font-black">{crossBranchAlert.restaurantName}</span>!
              </p>
              <p className="text-xs text-amber-100">
                You are currently viewing {currentBranchName}. Switch stores to view and prepare this order.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-white text-amber-900 hover:bg-amber-50 font-bold shadow-sm"
              onClick={() => {
                const target = restaurants.find((r) => r.id === crossBranchAlert.restaurantId);
                if (target) {
                  setSelectedBranchId(target.id);
                  setRestaurant(target);
                  setCrossBranchAlert(null);
                }
              }}
            >
              Switch Store <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <button
              onClick={() => setCrossBranchAlert(null)}
              className="p-1 hover:bg-amber-600 rounded-lg text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Branch Filter Bar */}
      {(isAdmin || restaurants.length > 1) && (
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
            <Store className="w-4 h-4 text-brand-500" />
            <span>{isAdmin ? 'View Scope:' : 'Active Branch:'}</span>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <button
                onClick={() => setSelectedBranchId('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  isViewingAll
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                    : 'bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200/60 dark:border-slate-700'
                }`}
              >
                <span>🌐 All Restaurants</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    isViewingAll ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                  }`}
                >
                  All ({orders.length})
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
        </div>
      )}

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Column 1: New Incoming Orders */}
        <div className="flex flex-col bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-200/60 dark:border-amber-900/40">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <h2 className="font-extrabold text-sm text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                Incoming Orders
              </h2>
            </div>
            <span className="bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-black px-2.5 py-0.5 rounded-full">
              {pendingOrders.length}
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-230px)] pr-1">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-12 text-xs font-semibold text-amber-800/60 dark:text-amber-400/60">
                No new orders waiting
              </div>
            ) : (
              pendingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  elapsed={formatElapsed(order.placedAt)}
                  onView={() => setSelectedOrder(order)}
                  actions={
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                      <Button
                        size="sm"
                        variant="success"
                        isLoading={updateStatusMutation.isPending}
                        onClick={() => handleStatusChange(order.id, OrderStatus.RESTAURANT_ACCEPTED)}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowDeclineModal(true);
                        }}
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Decline
                      </Button>
                    </div>
                  }
                />
              ))
            )}
          </div>
        </div>

        {/* Column 2: In Kitchen / Preparing */}
        <div className="flex flex-col bg-blue-50/40 dark:bg-blue-950/20 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-blue-200/60 dark:border-blue-900/40">
            <div className="flex items-center gap-2">
              <Utensils className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="font-extrabold text-sm text-blue-900 dark:text-blue-200 uppercase tracking-wide">
                Kitchen Preparing
              </h2>
            </div>
            <span className="bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-xs font-black px-2.5 py-0.5 rounded-full">
              {inKitchenOrders.length}
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-230px)] pr-1">
            {inKitchenOrders.length === 0 ? (
              <div className="text-center py-12 text-xs font-semibold text-blue-800/60 dark:text-blue-400/60">
                Kitchen queue is clear
              </div>
            ) : (
              inKitchenOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  elapsed={formatElapsed(order.placedAt)}
                  onView={() => setSelectedOrder(order)}
                  actions={
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                      {order.status === OrderStatus.RESTAURANT_ACCEPTED ? (
                        <Button
                          size="sm"
                          variant="primary"
                          className="w-full"
                          isLoading={updateStatusMutation.isPending}
                          onClick={() => handleStatusChange(order.id, OrderStatus.PREPARING)}
                        >
                          <Utensils className="w-3.5 h-3.5 mr-1.5" /> Start Cooking
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="success"
                          className="w-full"
                          isLoading={updateStatusMutation.isPending}
                          onClick={() =>
                            handleStatusChange(order.id, OrderStatus.READY_FOR_PICKUP)
                          }
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Food Ready for Courier
                        </Button>
                      )}
                    </div>
                  }
                />
              ))
            )}
          </div>
        </div>

        {/* Column 3: Ready for Pickup / Courier Assigned */}
        <div className="flex flex-col bg-purple-50/40 dark:bg-purple-950/20 rounded-2xl border border-purple-200/80 dark:border-purple-900/40 p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-purple-200/60 dark:border-purple-900/40">
            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h2 className="font-extrabold text-sm text-purple-900 dark:text-purple-200 uppercase tracking-wide">
                Ready / Awaiting Courier
              </h2>
            </div>
            <span className="bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 text-xs font-black px-2.5 py-0.5 rounded-full">
              {readyOrders.length}
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-230px)] pr-1">
            {readyOrders.length === 0 ? (
              <div className="text-center py-12 text-xs font-semibold text-purple-800/60 dark:text-purple-400/60">
                No orders waiting for courier
              </div>
            ) : (
              readyOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  elapsed={formatElapsed(order.placedAt)}
                  onView={() => setSelectedOrder(order)}
                  badgeVariant="purple"
                  badgeText={
                    order.status === OrderStatus.DRIVER_ASSIGNED
                      ? 'Driver Heading to Store'
                      : 'Packaged & Waiting'
                  }
                />
              ))
            )}
          </div>
        </div>

        {/* Column 4: Out for Delivery / Completed */}
        <div className="flex flex-col bg-gray-100/60 dark:bg-slate-900/60 rounded-2xl border border-gray-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="font-extrabold text-sm text-gray-900 dark:text-slate-100 uppercase tracking-wide">
                En Route & Completed
              </h2>
            </div>
            <span className="bg-gray-200 dark:bg-slate-800 text-gray-800 dark:text-slate-200 text-xs font-black px-2.5 py-0.5 rounded-full">
              {outOrDeliveredOrders.length}
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-230px)] pr-1">
            {outOrDeliveredOrders.length === 0 ? (
              <div className="text-center py-12 text-xs font-semibold text-gray-500 dark:text-slate-400">
                No completed orders today yet
              </div>
            ) : (
              outOrDeliveredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  elapsed={formatElapsed(order.placedAt)}
                  onView={() => setSelectedOrder(order)}
                  badgeVariant={order.status === OrderStatus.DELIVERED ? 'success' : 'info'}
                  badgeText={
                    order.status === OrderStatus.DELIVERED
                      ? 'Delivered'
                      : 'Driver on the Way'
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>


      {/* Order Details & Kitchen Ticket Modal */}
      {selectedOrder && (
        <Modal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          title={`Order #${selectedOrder.orderNumber} Details`}
          maxWidth="lg"
        >
          <div className="space-y-5">
            {/* Target Restaurant identity */}
            {selectedOrder.restaurant && (
              <div className="bg-orange-50/80 border border-orange-200/80 p-3.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm shadow-brand-500/20">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-orange-800/80 uppercase tracking-wider block">
                      Restaurant & Branch
                    </span>
                    <span className="text-sm font-extrabold text-gray-900">
                      {selectedOrder.restaurant.name}
                    </span>
                  </div>
                </div>
                {selectedOrder.restaurant.city && (
                  <span className="text-xs font-bold text-orange-700 bg-white/90 border border-orange-200 px-2.5 py-1 rounded-lg">
                    {selectedOrder.restaurant.city} Branch
                  </span>
                )}
              </div>
            )}

            {/* Header info */}
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Status
                </span>
                <span className="text-sm font-extrabold text-gray-900">{selectedOrder.status}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Placed At
                </span>
                <span className="text-sm font-semibold text-gray-700">
                  {new Date(selectedOrder.placedAt).toLocaleTimeString()}
                </span>
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Payment
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {selectedOrder.payment?.paymentMethod || 'COD'}
                </span>
              </div>
            </div>

            {/* Special kitchen instructions */}
            {selectedOrder.specialInstructions && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs font-semibold">
                ⚠️ Kitchen Note: {selectedOrder.specialInstructions}
              </div>
            )}

            {/* Items ticket */}
            <div>
              <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2.5">
                Ordered Food Items ({selectedOrder.items?.length || 0})
              </h4>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
                {(selectedOrder.items || []).map((item) => (
                  <div key={item.id} className="p-3.5 flex justify-between items-start">
                    <div className="flex gap-3">
                      <span className="w-6 h-6 rounded-md bg-brand-50 text-brand-600 font-extrabold text-xs flex items-center justify-center shrink-0">
                        {item.quantity}x
                      </span>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{item.nameSnapshot}</p>
                        {item.addons && item.addons.length > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            + {item.addons.map((a) => a.nameSnapshot).join(', ')}
                          </p>
                        )}
                        {item.specialNotes && (
                          <p className="text-xs text-amber-700 italic mt-0.5">
                            "{item.specialNotes}"
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      ${Number(item.subtotal || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bill summary */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Food Subtotal</span>
                <span>${Number(selectedOrder.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery Fee</span>
                <span>${Number(selectedOrder.deliveryFee || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Platform Service Fee</span>
                <span>${Number(selectedOrder.serviceFee || 0).toFixed(2)}</span>
              </div>
              {Number(selectedOrder.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Coupon Discount</span>
                  <span>-${Number(selectedOrder.discountAmount || 0).toFixed(2)}</span>
                </div>
              )}
              {Number(selectedOrder.tipAmount || 0) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Driver Tip</span>
                  <span>+${Number(selectedOrder.tipAmount || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-gray-200">
                <span>Total Amount</span>
                <span>${Number(selectedOrder.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
              {selectedOrder.status === OrderStatus.PENDING && (
                <Button
                  variant="success"
                  onClick={() => {
                    handleStatusChange(selectedOrder.id, OrderStatus.RESTAURANT_ACCEPTED);
                    setSelectedOrder(null);
                  }}
                >
                  Accept Order
                </Button>
              )}
              {selectedOrder.status === OrderStatus.RESTAURANT_ACCEPTED && (
                <Button
                  variant="primary"
                  onClick={() => {
                    handleStatusChange(selectedOrder.id, OrderStatus.PREPARING);
                    setSelectedOrder(null);
                  }}
                >
                  Start Cooking
                </Button>
              )}
              {selectedOrder.status === OrderStatus.PREPARING && (
                <Button
                  variant="success"
                  onClick={() => {
                    handleStatusChange(selectedOrder.id, OrderStatus.READY_FOR_PICKUP);
                    setSelectedOrder(null);
                  }}
                >
                  Mark Food Ready
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Decline Order Modal */}
      {showDeclineModal && selectedOrder && (
        <Modal
          isOpen={showDeclineModal}
          onClose={() => setShowDeclineModal(false)}
          title="Decline Order"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-600">
              Please specify the reason for declining order #{selectedOrder.orderNumber}:
            </p>
            <div className="space-y-2">
              {['Kitchen at full capacity', 'Out of required ingredients', 'Store closing early'].map(
                (reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setDeclineReason(reason)}
                    className={`w-full p-2.5 text-xs text-left rounded-xl border transition-all ${
                      declineReason === reason
                        ? 'border-brand-500 bg-brand-50 text-brand-700 font-bold'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {reason}
                  </button>
                )
              )}
            </div>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Or write custom reason..."
              rows={2}
              className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:ring-1 focus:ring-brand-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setShowDeclineModal(false)}>
                Back
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={cancelMutation.isPending}
                disabled={!declineReason.trim()}
                onClick={() =>
                  cancelMutation.mutate({
                    orderId: selectedOrder.id,
                    reason: declineReason.trim(),
                  })
                }
              >
                Confirm Decline
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

interface OrderCardProps {
  order: OrderSummary;
  elapsed: string;
  onView: () => void;
  actions?: React.ReactNode;
  badgeVariant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  badgeText?: string;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  elapsed,
  onView,
  actions,
  badgeVariant,
  badgeText,
}) => {
  const itemsCount = (order.items || []).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="font-extrabold text-sm text-gray-900 dark:text-white tracking-tight">
          #{order.orderNumber}
        </span>
        <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {elapsed}
        </span>
      </div>

      {order.restaurant && (
        <div className="flex items-center gap-1.5 mb-2 bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-800/40 px-2 py-0.5 rounded-lg w-fit max-w-full">
          <Store className="w-3 h-3 text-brand-600 dark:text-brand-400 shrink-0" />
          <span className="text-[11px] font-bold text-orange-950 dark:text-orange-200 truncate max-w-[170px]">
            {order.restaurant.name}
          </span>
          {order.restaurant.city && (
            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold shrink-0">
              • {order.restaurant.city}
            </span>
          )}
        </div>
      )}

      <div className="text-xs text-gray-600 dark:text-slate-300 mb-2 font-medium">
        <span className="font-bold text-gray-900 dark:text-white">{itemsCount} items</span> • $
        {Number(order.totalAmount || 0).toFixed(2)}
      </div>

      <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 mb-3">
        {(order.items || []).map((i) => `${i.quantity}x ${i.nameSnapshot}`).join(', ')}
      </p>

      {badgeText && (
        <div className="mb-2">
          <Badge variant={badgeVariant || 'default'} size="sm">
            {badgeText}
          </Badge>
        </div>
      )}

      <button
        onClick={onView}
        className="w-full py-1.5 px-3 rounded-lg bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
      >
        <Eye className="w-3.5 h-3.5" /> View Ticket
      </button>

      {actions}
    </div>
  );
};

const StoreUnavailable: React.FC = () => (
  <div>
    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
    <h3 className="text-base font-bold text-gray-900">No Restaurant Profile Connected</h3>
    <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
      You are not currently linked as an owner of an approved restaurant. Please create or link a
      store in settings.
    </p>
  </div>
);
