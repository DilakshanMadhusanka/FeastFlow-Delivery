import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tag,
  Plus,
  Percent,
  Calendar,
  CheckCircle2,
  XCircle,
  Trash2,
  Search,
  Sparkles,
  ShoppingBag,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { couponService } from '../../services/coupon.service';
import { Coupon, CreateCouponInput } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Navbar } from '../../components/layout/Navbar';

export const CouponsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('15');
  const [minimumAmount, setMinimumAmount] = useState('20');
  const [maxDiscount, setMaxDiscount] = useState('10');
  const [usageLimit, setUsageLimit] = useState('100');
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [formError, setFormError] = useState('');

  const { data: coupons = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['coupons', search],
    queryFn: () => couponService.getCoupons({ search: search || undefined }),
    staleTime: 30 * 1000,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => couponService.toggleCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => couponService.deleteCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateCouponInput) => couponService.createCoupon(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to create coupon.');
    },
  });

  const resetForm = () => {
    setCode('');
    setDescription('');
    setDiscountType('PERCENTAGE');
    setDiscountValue('15');
    setMinimumAmount('20');
    setMaxDiscount('10');
    setUsageLimit('100');
    setFormError('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!code.trim()) {
      setFormError('Coupon code is required.');
      return;
    }

    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) {
      setFormError('Valid discount value is required.');
      return;
    }

    createMutation.mutate({
      code: code.trim().toUpperCase(),
      description: description.trim() || undefined,
      discountType,
      discountValue: val,
      minimumAmount: parseFloat(minimumAmount) || 0,
      maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
      usageLimit: usageLimit ? parseInt(usageLimit, 10) : null,
      endDate: new Date(`${endDate}T23:59:59Z`).toISOString(),
      isActive: true,
    });
  };

  const activeCount = coupons.filter((c) => c.isActive && new Date(c.endDate) > new Date()).length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.usageCount || c.usedCount || 0), 0);

  return (
    <div className="space-y-6">
      <Navbar title="Promotions & Coupons Manager" onRefresh={refetch} isRefreshing={isRefetching} />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Coupons</p>
            <p className="text-2xl font-black text-gray-900">{coupons.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Promos</p>
            <p className="text-2xl font-black text-emerald-600">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Redemptions</p>
            <p className="text-2xl font-black text-blue-600">{totalRedemptions}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Platform Take-up</p>
            <p className="text-2xl font-black text-purple-600">
              {coupons.length > 0 ? `${Math.round((activeCount / coupons.length) * 100)}%` : '0%'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search promo codes or descriptions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <Button
          variant="primary"
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="shadow-sm shadow-brand-500/20"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Create Promo Code
        </Button>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-500 font-semibold">Loading promotions...</div>
        ) : coupons.length === 0 ? (
          <div className="p-16 text-center">
            <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-900">No promo codes found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Create platform discounts and seasonal marketing campaigns to boost customer order volume.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Coupon Code</th>
                  <th className="py-3.5 px-4">Discount</th>
                  <th className="py-3.5 px-4">Min. Spend</th>
                  <th className="py-3.5 px-4">Redemptions</th>
                  <th className="py-3.5 px-4">Validity</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {coupons.map((coupon) => {
                  const isExpired = new Date(coupon.endDate) < new Date();
                  return (
                    <tr key={coupon.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-black text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200/60 text-xs">
                            {coupon.code}
                          </span>
                          {coupon.description && (
                            <span className="text-gray-500 text-[11px] truncate max-w-[180px]">
                              {coupon.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-bold text-gray-900">
                        {coupon.discountType === 'PERCENTAGE'
                          ? `${coupon.discountValue}% OFF`
                          : `$${Number(coupon.discountValue || 0).toFixed(2)} OFF`}
                        {coupon.maxDiscount && (
                          <span className="text-[10px] text-gray-400 font-normal block">
                            Up to ${Number(coupon.maxDiscount).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-semibold text-gray-700">
                        ${Number(coupon.minimumAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-gray-900">
                          {coupon.usageCount || coupon.usedCount || 0}
                        </span>
                        {coupon.usageLimit && (
                          <span className="text-gray-400 text-[11px]"> / {coupon.usageLimit}</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-gray-600 font-medium">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{new Date(coupon.endDate).toLocaleDateString()}</span>
                        </div>
                        {isExpired && (
                          <span className="text-[10px] font-bold text-red-600">Expired</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => toggleMutation.mutate(coupon.id)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition-colors ${
                            coupon.isActive && !isExpired
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          {coupon.isActive && !isExpired ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-gray-400" /> Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete coupon code '${coupon.code}'?`)) {
                              deleteMutation.mutate(coupon.id);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Coupon"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Promo Code Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Create New Promo Code"
          maxWidth="md"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Coupon Code* (e.g. SUMMER25)
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="PROMOCODE"
                className="w-full text-xs font-mono font-bold p-2.5 bg-gray-50 border border-gray-200 rounded-xl uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Description / Campaign Tag
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="25% off weekend special"
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Discount Type*
                </label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold"
                >
                  <option value="PERCENTAGE">Percentage (% Off)</option>
                  <option value="FIXED">Fixed Amount ($ Off)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  {discountType === 'PERCENTAGE' ? 'Discount Percentage (%)*' : 'Discount Amount ($)*'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Minimum Order Subtotal ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={minimumAmount}
                  onChange={(e) => setMinimumAmount(e.target.value)}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Max Discount Cap ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                  placeholder="Optional max cap"
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Global Usage Limit
                </label>
                <input
                  type="number"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  placeholder="Unlimited if empty"
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Expiration Date*
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={createMutation.isPending}>
                Create Coupon
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
