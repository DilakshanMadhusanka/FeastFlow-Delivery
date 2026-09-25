import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Flame,
  Plus,
  Percent,
  Clock,
  Calendar,
  Gift,
  Truck,
  CheckCircle2,
  Trash2,
  TrendingUp,
  Tag,
  ArrowRight,
  Zap,
  ShoppingBag,
} from 'lucide-react';
import { marketingService, MarketingCampaign } from '../../services/marketing.service';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';

export const MarketingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { restaurant } = useAuthStore();
  const restaurantId = restaurant?.id || 'all';

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<'HAPPY_HOUR' | 'BOGO' | 'FREE_DELIVERY' | 'WIN_BACK'>('HAPPY_HOUR');
  const [discountValue, setDiscountValue] = useState('20');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [minOrderAmount, setMinOrderAmount] = useState('15');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('17:00');
  const [targetItemName, setTargetItemName] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [formError, setFormError] = useState('');

  // 1. Fetch campaigns
  const {
    data: campaigns = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['marketingCampaigns', restaurantId],
    queryFn: () => marketingService.getCampaigns(restaurantId),
  });

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: marketingService.createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketingCampaigns'] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || err.message || 'Failed to create campaign');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => marketingService.toggleCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketingCampaigns'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => marketingService.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketingCampaigns'] });
    },
  });

  const resetForm = () => {
    setName('');
    setType('HAPPY_HOUR');
    setDiscountValue('20');
    setDiscountType('PERCENTAGE');
    setMinOrderAmount('15');
    setStartTime('14:00');
    setEndTime('17:00');
    setTargetItemName('');
    setSelectedDays([1, 2, 3, 4, 5]);
    setFormError('');
  };

  const applyTemplate = (templateType: 'HAPPY_HOUR' | 'FREE_DELIVERY' | 'BOGO') => {
    if (templateType === 'HAPPY_HOUR') {
      setName('Late Afternoon Rush Happy Hour');
      setType('HAPPY_HOUR');
      setDiscountValue('20');
      setDiscountType('PERCENTAGE');
      setMinOrderAmount('15');
      setStartTime('14:00');
      setEndTime('17:00');
      setSelectedDays([1, 2, 3, 4, 5]);
    } else if (templateType === 'FREE_DELIVERY') {
      setName('Free Delivery Tier ($30+ Order)');
      setType('FREE_DELIVERY');
      setDiscountValue('100');
      setDiscountType('PERCENTAGE');
      setMinOrderAmount('30');
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    } else if (templateType === 'BOGO') {
      setName('BOGO Special: Buy One, Get One Free');
      setType('BOGO');
      setDiscountValue('100');
      setDiscountType('PERCENTAGE');
      setMinOrderAmount('20');
      setTargetItemName('Classic Cheeseburger');
      setSelectedDays([5, 6]); // Weekend
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Campaign name is required');
      return;
    }

    createMutation.mutate({
      restaurantId,
      name: name.trim(),
      type,
      discountValue: parseFloat(discountValue) || 10,
      discountType,
      minOrderAmount: parseFloat(minOrderAmount) || 0,
      startTime: type === 'HAPPY_HOUR' ? startTime : undefined,
      endTime: type === 'HAPPY_HOUR' ? endTime : undefined,
      applicableDays: selectedDays,
      targetItemName: type === 'BOGO' ? targetItemName : undefined,
      isActive: true,
    });
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const filteredCampaigns = campaigns.filter((c) => {
    if (filterType === 'ALL') return true;
    return c.type === filterType;
  });

  const totalRedemptions = campaigns.reduce((acc, c) => acc + (c.redemptionCount || 0), 0);
  const activeCount = campaigns.filter((c) => c.isActive).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Flash Deals & Promotions Engine
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                {activeCount} Active Deals
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Run automated Happy Hours, Buy-One-Get-One specials, and delivery threshold promotions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-rose-50 border border-rose-200/80 rounded-xl text-center">
            <span className="text-xs font-semibold text-rose-600 block">Total Redemptions</span>
            <span className="text-lg font-black text-rose-700">{totalRedemptions}</span>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold flex items-center gap-1.5 h-11"
          >
            <Plus className="w-4 h-4" />
            Launch Campaign
          </Button>
        </div>
      </div>

      {/* Quick Launch Templates Strip */}
      <div className="bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-rose-500/5 border border-amber-200/60 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-xs font-bold text-gray-900">
              1-Click High-Converting Campaign Templates:
            </p>
            <p className="text-[11px] text-gray-500">
              Launch proven restaurant discount workflows instantly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              applyTemplate('HAPPY_HOUR');
              setShowCreateModal(true);
            }}
            className="px-3 py-1.5 bg-white hover:bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            20% Afternoon Happy Hour
          </button>
          <button
            onClick={() => {
              applyTemplate('FREE_DELIVERY');
              setShowCreateModal(true);
            }}
            className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1"
          >
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            Free Delivery $30+
          </button>
          <button
            onClick={() => {
              applyTemplate('BOGO');
              setShowCreateModal(true);
            }}
            className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1"
          >
            <Gift className="w-3.5 h-3.5 text-rose-600" />
            BOGO Special
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
        {['ALL', 'HAPPY_HOUR', 'BOGO', 'FREE_DELIVERY'].map((f) => (
          <button
            key={f}
            onClick={() => setFilterType(f)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === f
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f === 'ALL'
              ? 'All Deals'
              : f === 'HAPPY_HOUR'
              ? 'Happy Hours'
              : f === 'BOGO'
              ? 'Buy 1 Get 1 (BOGO)'
              : 'Free Delivery'}
          </button>
        ))}
      </div>

      {/* Campaigns Grid */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400 font-semibold text-xs">
          Loading campaigns...
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 p-8">
          <Tag className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="font-bold text-gray-700 text-sm">No campaigns in this category</p>
          <p className="text-xs text-gray-400 mt-1">
            Create a campaign or click one of the quick templates above to boost order volume.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCampaigns.map((c) => {
            const isHappyHour = c.type === 'HAPPY_HOUR';
            const isBogo = c.type === 'BOGO';
            const isFreeDelivery = c.type === 'FREE_DELIVERY';

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                        isHappyHour
                          ? 'bg-amber-100 text-amber-800'
                          : isBogo
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {isHappyHour && <Clock className="w-3 h-3" />}
                      {isBogo && <Gift className="w-3 h-3" />}
                      {isFreeDelivery && <Truck className="w-3 h-3" />}
                      {c.type.replace('_', ' ')}
                    </span>

                    {/* Active Toggle Switch */}
                    <button
                      onClick={() => toggleMutation.mutate(c.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        c.isActive ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          c.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <h3 className="font-black text-base text-gray-900 leading-snug mb-1">
                    {c.name}
                  </h3>

                  <div className="space-y-1.5 text-xs text-gray-600 mt-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-semibold">Benefit:</span>
                      <span className="font-extrabold text-brand-600">
                        {isFreeDelivery
                          ? '100% Free Delivery'
                          : isBogo
                          ? `Free Item (${c.targetItemName || 'Selected'})`
                          : `${c.discountValue}% Off`}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-semibold">Min. Order:</span>
                      <span className="font-bold text-gray-800">
                        ${c.minOrderAmount.toFixed(2)}
                      </span>
                    </div>

                    {isHappyHour && c.startTime && c.endTime && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 font-semibold">Time Window:</span>
                        <span className="font-bold text-amber-700">
                          {c.startTime} – {c.endTime}
                        </span>
                      </div>
                    )}

                    {c.applicableDays && c.applicableDays.length > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 font-semibold">Active Days:</span>
                        <span className="font-semibold text-gray-700">
                          {c.applicableDays.map((d) => dayNames[d]).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom stats and delete */}
                <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-gray-500">
                    <ShoppingBag className="w-4 h-4 text-emerald-600" />
                    <span>{c.redemptionCount} times redeemed</span>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Delete campaign "${c.name}"?`)) {
                        deleteMutation.mutate(c.id);
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Campaign"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowCreateModal(false)}
          title="Launch Marketing Campaign"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Campaign Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 20% Afternoon Happy Hour"
                className="w-full text-xs font-medium bg-white border border-gray-300 rounded-xl p-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Campaign Type
                </label>
                <select
                  value={type}
                  onChange={(e: any) => setType(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-gray-300 rounded-xl p-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="HAPPY_HOUR">Happy Hour (Timed)</option>
                  <option value="FREE_DELIVERY">Free Delivery Threshold</option>
                  <option value="BOGO">Buy 1 Get 1 (BOGO)</option>
                  <option value="WIN_BACK">Customer Win-Back</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Min. Order Amount ($)
                </label>
                <input
                  type="number"
                  step="1"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(e.target.value)}
                  placeholder="20"
                  className="w-full text-xs font-semibold bg-white border border-gray-300 rounded-xl p-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {type === 'HAPPY_HOUR' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-200/60">
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-amber-300 rounded-lg p-2 text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-amber-300 rounded-lg p-2 text-gray-800"
                  />
                </div>
              </div>
            )}

            {type === 'BOGO' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Target Food Item Name
                </label>
                <input
                  type="text"
                  value={targetItemName}
                  onChange={(e) => setTargetItemName(e.target.value)}
                  placeholder="e.g. Margherita Pizza or Double Burger"
                  className="w-full text-xs font-medium bg-white border border-gray-300 rounded-xl p-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}

            {/* Applicable Days Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Applicable Days of Week
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {dayNames.map((name, index) => {
                  const isSelected = selectedDays.includes(index);
                  return (
                    <button
                      type="button"
                      key={index}
                      onClick={() => {
                        setSelectedDays((prev) =>
                          isSelected ? prev.filter((d) => d !== index) : [...prev, index]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-brand-500 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" type="button" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-brand-500 hover:bg-brand-600 text-white font-bold"
              >
                {createMutation.isPending ? 'Activating Deal...' : 'Publish Campaign'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
