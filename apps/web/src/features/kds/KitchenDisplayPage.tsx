import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Utensils,
  Clock,
  CheckCircle2,
  Printer,
  Volume2,
  VolumeX,
  RefreshCw,
  Maximize2,
  Store,
  AlertTriangle,
  Flame,
  ChefHat,
  Check,
  X,
  Zap,
  Search,
  Slash,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { orderService } from '../../services/order.service';
import { menuService } from '../../services/menu.service';
import { socketService } from '../../services/socket.service';
import { OrderStatus, OrderSummary, UserRole } from '@food-delivery/shared';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

export const KitchenDisplayPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { restaurant, restaurants, setRestaurant, user } = useAuthStore();
  const isAdmin = Boolean(
    user?.roles?.includes(UserRole.ADMIN) || user?.roles?.includes('ADMIN' as any)
  );

  const [selectedBranchId, setSelectedBranchId] = useState<string>(() =>
    isAdmin ? 'ALL' : restaurant?.id || 'ALL'
  );
  const isViewingAll = selectedBranchId === 'ALL';
  const queryRestaurantId = isViewingAll ? 'all' : selectedBranchId;

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedStation, setSelectedStation] = useState<string>('ALL');
  const [printOrder, setPrintOrder] = useState<OrderSummary | null>(null);

  // Quick 86 / Item Snooze State
  const [showSnoozeModal, setShowSnoozeModal] = useState(false);
  const [snoozeSearchQuery, setSnoozeSearchQuery] = useState('');

  const { data: menuCategories = [], refetch: refetchMenu } = useQuery({
    queryKey: ['kdsMenu', queryRestaurantId],
    queryFn: () => menuService.getRestaurantMenu(queryRestaurantId),
    enabled: showSnoozeModal,
  });

  const allMenuItems: any[] = (menuCategories as any[]).flatMap((c: any) => c.foodItems || []);

  const snoozeMutation = useMutation({
    mutationFn: ({ id, duration }: { id: string; duration: '2_HOURS' | 'REST_OF_DAY' | 'INDEFINITE' }) =>
      menuService.snoozeFoodItem(id, duration),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kdsMenu'] });
      queryClient.invalidateQueries({ queryKey: ['restaurantMenu'] });
    },
  });

  const unsnoozeMutation = useMutation({
    mutationFn: (id: string) => menuService.unsnoozeFoodItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kdsMenu'] });
      queryClient.invalidateQueries({ queryKey: ['restaurantMenu'] });
    },
  });


  // Audio synthesizer chime for kitchen alerts
  const playAlert = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // AudioContext policy
    }
  };

  // Socket event subscription
  useEffect(() => {
    const socket = socketService.connect();
    if (restaurant?.id && restaurant.id !== 'all') {
      socketService.joinRestaurant(restaurant.id);
    }

    const unsubNewOrder = socketService.onNewOrder((newOrder) => {
      playAlert();
      queryClient.invalidateQueries({ queryKey: ['kdsOrders'] });
    });

    const unsubStatus = socketService.onOrderStatusChanged(() => {
      queryClient.invalidateQueries({ queryKey: ['kdsOrders'] });
    });

    return () => {
      unsubNewOrder();
      unsubStatus();
      if (restaurant?.id && restaurant.id !== 'all') {
        socketService.leaveRestaurant(restaurant.id);
      }
    };
  }, [restaurant?.id, queryClient, soundEnabled]);

  // Fetch live active orders
  const { data: ordersData, refetch, isRefetching } = useQuery({
    queryKey: ['kdsOrders', queryRestaurantId],
    queryFn: () => orderService.getRestaurantOrders(queryRestaurantId, { limit: 100 }),
    refetchInterval: 4000,
    staleTime: 2000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      orderService.updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kdsOrders'] });
      queryClient.invalidateQueries({ queryKey: ['restaurantOrders'] });
    },
  });

  const allOrders = ordersData?.items || [];
  // Active kitchen orders: PENDING, RESTAURANT_ACCEPTED, PREPARING
  const activeOrders = allOrders.filter(
    (o) =>
      o.status === OrderStatus.PENDING ||
      o.status === OrderStatus.RESTAURANT_ACCEPTED ||
      o.status === OrderStatus.PREPARING
  );

  const handlePrint = (order: OrderSummary) => {
    setPrintOrder(order);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const getPrepTimeElapsedMinutes = (placedAt: string) => {
    return Math.floor((Date.now() - new Date(placedAt).getTime()) / 60000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col -m-6 p-6">
      {/* KDS Header */}
      <div className="flex flex-wrap items-center justify-between pb-5 mb-5 border-b border-zinc-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-600/30">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2 text-white">
              Kitchen Display System (KDS)
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30">
                STATION MODE
              </span>
            </h1>
            <p className="text-xs text-zinc-400 font-medium">
              Real-time line cook tickets & ticket printer integration
            </p>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-3">
          {/* Branch Selector */}
          {(isAdmin || restaurants.length > 1) && (
            <select
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value);
                const found = restaurants.find((r) => r.id === e.target.value);
                if (found) setRestaurant(found);
              }}
              className="bg-zinc-900 border border-zinc-700 text-xs font-bold text-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
            >
              {isAdmin && <option value="ALL">🌐 All Restaurants</option>}
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.city})
                </option>
              ))}
            </select>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
              soundEnabled
                ? 'bg-zinc-900 border-zinc-700 text-emerald-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}
            title={soundEnabled ? 'Mute Chime' : 'Unmute Chime'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'Chime ON' : 'Chime OFF'}</span>
          </button>

          {/* Quick 86 / Snooze Button */}
          <button
            onClick={() => setShowSnoozeModal(true)}
            className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 rounded-xl text-xs font-bold text-rose-300 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Slash className="w-3.5 h-3.5 text-rose-400" />
            <span>86 Item / Snooze</span>
          </button>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-300 transition-colors"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Ticket Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-400">Total Active Tickets</span>
          <span className="text-xl font-black text-white">{activeOrders.length}</span>
        </div>
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs font-bold text-amber-400">New Incoming</span>
          <span className="text-xl font-black text-amber-400">
            {activeOrders.filter((o) => o.status === OrderStatus.PENDING).length}
          </span>
        </div>
        <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs font-bold text-blue-400">Cooking Now</span>
          <span className="text-xl font-black text-blue-400">
            {activeOrders.filter((o) => o.status === OrderStatus.PREPARING).length}
          </span>
        </div>
        <div className="bg-rose-950/30 border border-rose-800/40 rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs font-bold text-rose-400">Delayed (&gt;18m)</span>
          <span className="text-xl font-black text-rose-400">
            {activeOrders.filter((o) => getPrepTimeElapsedMinutes(o.placedAt) >= 18).length}
          </span>
        </div>
      </div>

      {/* Tickets Grid */}
      {activeOrders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-zinc-800 rounded-3xl">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4 animate-bounce" />
          <h2 className="text-2xl font-black text-white">All Clear! No Active Kitchen Tickets</h2>
          <p className="text-sm text-zinc-400 max-w-sm mt-1">
            New orders placed by customers will automatically chime and appear on this screen.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activeOrders.map((order) => {
            const elapsed = getPrepTimeElapsedMinutes(order.placedAt);
            const isDelayed = elapsed >= 18;
            const isWarning = elapsed >= 10 && elapsed < 18;

            return (
              <div
                key={order.id}
                className={`bg-zinc-900 rounded-2xl flex flex-col justify-between border-2 transition-all ${
                  isDelayed
                    ? 'border-rose-600 shadow-lg shadow-rose-900/30 animate-pulse'
                    : isWarning
                    ? 'border-amber-500 shadow-md shadow-amber-900/20'
                    : 'border-zinc-700'
                }`}
              >
                {/* Ticket Header */}
                <div
                  className={`p-3.5 border-b flex items-center justify-between rounded-t-2xl ${
                    isDelayed
                      ? 'bg-rose-950/60 border-rose-800'
                      : isWarning
                      ? 'bg-amber-950/50 border-amber-800'
                      : 'bg-zinc-800/60 border-zinc-700'
                  }`}
                >
                  <div>
                    <span className="text-lg font-black text-white block leading-tight">
                      #{order.orderNumber}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-semibold truncate block max-w-[140px]">
                      {order.restaurant?.name || 'Kitchen'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                        isDelayed
                          ? 'bg-rose-600 text-white font-extrabold'
                          : isWarning
                          ? 'bg-amber-500 text-zinc-950 font-extrabold'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" /> {elapsed}m
                    </span>
                    <button
                      onClick={() => handlePrint(order)}
                      title="Print ESC/POS Kitchen Ticket"
                      className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Special Instructions Alert */}
                {order.specialInstructions && (
                  <div className="bg-amber-500/20 border-b border-amber-500/30 p-2.5 text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>NOTE: {order.specialInstructions}</span>
                  </div>
                )}

                {/* Ordered Items List */}
                <div className="p-4 divide-y divide-zinc-800 flex-1 space-y-2.5 overflow-y-auto max-h-[360px]">
                  {(order.items || []).map((item) => (
                    <div key={item.id} className="pt-2.5 first:pt-0">
                      <div className="flex items-start gap-2.5">
                        <span className="text-base font-black px-2 py-0.5 rounded-lg bg-orange-600 text-white shrink-0">
                          {item.quantity}x
                        </span>
                        <div className="flex-1">
                          <p className="text-base font-extrabold text-white leading-snug">
                            {item.nameSnapshot}
                          </p>
                          {item.addons && item.addons.length > 0 && (
                            <p className="text-xs font-semibold text-orange-300 mt-0.5">
                              + {item.addons.map((a) => a.nameSnapshot).join(', ')}
                            </p>
                          )}
                          {item.specialNotes && (
                            <p className="text-xs italic text-amber-400 mt-0.5">
                              "{item.specialNotes}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ticket Action Footers */}
                <div className="p-3 bg-zinc-950/60 border-t border-zinc-800 rounded-b-2xl">
                  {order.status === OrderStatus.PENDING && (
                    <Button
                      variant="primary"
                      className="w-full bg-orange-600 hover:bg-orange-500 font-black py-2.5 text-sm"
                      isLoading={updateStatusMutation.isPending}
                      onClick={() =>
                        updateStatusMutation.mutate({
                          orderId: order.id,
                          status: OrderStatus.RESTAURANT_ACCEPTED,
                        })
                      }
                    >
                      <Check className="w-4 h-4 mr-1.5" /> Accept Ticket
                    </Button>
                  )}

                  {order.status === OrderStatus.RESTAURANT_ACCEPTED && (
                    <Button
                      variant="primary"
                      className="w-full bg-blue-600 hover:bg-blue-500 font-black py-2.5 text-sm"
                      isLoading={updateStatusMutation.isPending}
                      onClick={() =>
                        updateStatusMutation.mutate({
                          orderId: order.id,
                          status: OrderStatus.PREPARING,
                        })
                      }
                    >
                      <Flame className="w-4 h-4 mr-1.5" /> Start Cooking
                    </Button>
                  )}

                  {order.status === OrderStatus.PREPARING && (
                    <Button
                      variant="success"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 font-black py-2.5 text-sm"
                      isLoading={updateStatusMutation.isPending}
                      onClick={() =>
                        updateStatusMutation.mutate({
                          orderId: order.id,
                          status: OrderStatus.READY_FOR_PICKUP,
                        })
                      }
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Ready for Courier
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden Thermal Receipt Print Layout for window.print() */}
      {printOrder && (
        <div className="hidden print:block fixed inset-0 bg-white text-black p-4 font-mono text-xs z-50">
          <div className="text-center pb-2 border-b border-black mb-2">
            <h1 className="text-lg font-black">{printOrder.restaurant?.name || 'FEASTFLOW KITCHEN'}</h1>
            <p className="text-[11px] font-bold">KITCHEN PREP TICKET</p>
            <p className="text-[10px]">{new Date().toLocaleString()}</p>
          </div>

          <div className="mb-2 pb-2 border-b border-black">
            <p className="text-base font-black">ORDER #{printOrder.orderNumber}</p>
            <p>Type: DELIVERY</p>
            {printOrder.specialInstructions && (
              <p className="font-bold mt-1">NOTE: {printOrder.specialInstructions}</p>
            )}
          </div>

          <div className="space-y-2 mb-3 pb-2 border-b border-black">
            {(printOrder.items || []).map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>
                  <strong>{item.quantity}x</strong> {item.nameSnapshot}
                  {item.addons && item.addons.length > 0 && (
                    <span className="block pl-4 text-[10px]">
                      + {item.addons.map((a) => a.nameSnapshot).join(', ')}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="text-center text-[10px]">
            <p>*** END OF TICKET ***</p>
          </div>
        </div>
      )}

      {/* Quick 86 / Item Snooze Modal */}
      {showSnoozeModal && (
        <Modal
          isOpen={showSnoozeModal}
          onClose={() => setShowSnoozeModal(false)}
          title="⚡ Quick 86 / Kitchen Item Snooze"
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <p className="text-gray-500">
              Temporarily snooze ingredients or dishes that ran out during service without deleting them from the menu.
            </p>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={snoozeSearchQuery}
                onChange={(e) => setSnoozeSearchQuery(e.target.value)}
                placeholder="Search dish or ingredient to 86..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
              {allMenuItems
                .filter((item: any) =>
                  item.name.toLowerCase().includes(snoozeSearchQuery.toLowerCase())
                )
                .map((item: any) => {
                  const isAvailable = item.isAvailable;
                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-gray-50 hover:bg-gray-100/80 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-sm">{item.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isAvailable
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isAvailable ? 'In Stock' : '86 / Snoozed'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          ${Number(item.price).toFixed(2)} • {item.category?.name || 'Item'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isAvailable ? (
                          <>
                            <button
                              onClick={() =>
                                snoozeMutation.mutate({ id: item.id, duration: '2_HOURS' })
                              }
                              className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[11px] font-bold transition-colors"
                            >
                              2 Hours
                            </button>
                            <button
                              onClick={() =>
                                snoozeMutation.mutate({ id: item.id, duration: 'REST_OF_DAY' })
                              }
                              className="px-2.5 py-1 bg-orange-100 hover:bg-orange-200 text-orange-900 rounded-lg text-[11px] font-bold transition-colors"
                            >
                              Rest of Day
                            </button>
                            <button
                              onClick={() =>
                                snoozeMutation.mutate({ id: item.id, duration: 'INDEFINITE' })
                              }
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition-colors"
                            >
                              86 Out of Stock
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => unsnoozeMutation.mutate(item.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Back in Stock
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <Button onClick={() => setShowSnoozeModal(false)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
