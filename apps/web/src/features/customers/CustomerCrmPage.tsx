import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Crown,
  Heart,
  Search,
  DollarSign,
  ShoppingBag,
  Gift,
  Clock,
  CheckCircle2,
  Mail,
  Phone,
  Sparkles,
  RefreshCw,
  Utensils,
  TrendingUp,
} from 'lucide-react';
import { customerService, CustomerProfile, CourtesyCreditResult } from '../../services/customer.service';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';

export const CustomerCrmPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { restaurant } = useAuthStore();
  const restaurantId = restaurant?.id || 'all';

  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'VIP' | 'REGULAR' | 'NEW'>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [creditAmount, setCreditAmount] = useState('10');
  const [creditReason, setCreditReason] = useState('VIP loyalty appreciation reward');
  const [creditResult, setCreditResult] = useState<CourtesyCreditResult | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueError, setIssueError] = useState('');

  // 1. Fetch CRM customers
  const {
    data: customers = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['crmCustomers', restaurantId],
    queryFn: () => customerService.getCustomers(restaurantId),
  });

  // Calculate platform/restaurant aggregates
  const totalGuests = customers.length;
  const vipCount = customers.filter((c) => c.loyaltyTier === 'VIP').length;
  const regularCount = customers.filter((c) => c.loyaltyTier === 'REGULAR').length;
  const totalLifetimeSpend = customers.reduce((sum, c) => sum + c.lifetimeSpend, 0);
  const totalOrders = customers.reduce((sum, c) => sum + c.totalOrders, 0);
  const averageAov = totalOrders > 0 ? totalLifetimeSpend / totalOrders : 0;

  // Filter logic
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery));
      if (!matchesSearch) return false;

      if (tierFilter !== 'ALL' && c.loyaltyTier !== tierFilter) return false;
      return true;
    });
  }, [customers, searchQuery, tierFilter]);

  // Issue courtesy credit
  const handleIssueCredit = async () => {
    if (!selectedCustomer) return;
    setIsIssuing(true);
    setIssueError('');
    setCreditResult(null);

    try {
      const res = await customerService.issueCourtesyCredit(selectedCustomer.id, {
        amount: parseFloat(creditAmount) || 10,
        reason: creditReason,
        restaurantName: restaurant?.name || 'FeastFlow',
      });
      setCreditResult(res);
      queryClient.invalidateQueries({ queryKey: ['crmCustomers'] });
    } catch (err: any) {
      setIssueError(err.response?.data?.message || err.message || 'Failed to issue courtesy credit');
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Customer CRM & VIP Guest Profiles
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                {vipCount} VIP Guests
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Track guest lifetime value, order frequency, favorite dishes, and issue instant courtesy credits.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 h-11"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-brand-500' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Guests</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-gray-900">{totalGuests}</p>
          <p className="text-[11px] text-gray-500 mt-1">Unique diners with order history</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">VIP Loyalty Guests</span>
            <Crown className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-700">{vipCount}</p>
          <p className="text-[11px] text-gray-500 mt-1">Spend &gt;$100 or 5+ orders</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Average Order Value</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-700">${averageAov.toFixed(2)}</p>
          <p className="text-[11px] text-gray-500 mt-1">Platform-wide average basket</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Lifetime Volume</span>
            <DollarSign className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-700">${totalLifetimeSpend.toFixed(2)}</p>
          <p className="text-[11px] text-gray-500 mt-1">Cumulative guest spend</p>
        </div>
      </div>

      {/* Search and Tier Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guest by name, email, or phone..."
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-gray-200 shadow-xs">
          {(['ALL', 'VIP', 'REGULAR', 'NEW'] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tier)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                tierFilter === tier
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tier === 'ALL'
                ? `All (${totalGuests})`
                : tier === 'VIP'
                ? `VIP (${vipCount})`
                : tier === 'REGULAR'
                ? `Regulars (${regularCount})`
                : 'New'}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Profiles Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="text-center py-20 text-gray-400 text-xs font-semibold">
            Loading guest profiles...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-20 px-4 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="font-bold text-gray-700 text-sm">No customer records found</p>
            <p className="text-xs text-gray-400 mt-1">
              Guest profiles are automatically synthesized as new orders come in.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Customer Guest</th>
                  <th className="py-3.5 px-6">Loyalty Tier</th>
                  <th className="py-3.5 px-6 text-center">Orders</th>
                  <th className="py-3.5 px-6 text-right">Lifetime Spend</th>
                  <th className="py-3.5 px-6 text-right">Avg Order (AOV)</th>
                  <th className="py-3.5 px-6">Favorite Dishes</th>
                  <th className="py-3.5 px-6">Last Active</th>
                  <th className="py-3.5 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredCustomers.map((cust) => {
                  const isVip = cust.loyaltyTier === 'VIP';
                  const isRegular = cust.loyaltyTier === 'REGULAR';

                  return (
                    <tr key={cust.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Customer info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center font-black text-xs text-gray-800 shrink-0">
                            {cust.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-gray-900">{cust.name}</p>
                            <p className="text-[11px] text-gray-500">{cust.email}</p>
                            {cust.phone && (
                              <p className="text-[10px] text-gray-400 mt-0.5">{cust.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tier */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            isVip
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : isRegular
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}
                        >
                          {isVip && <Crown className="w-3 h-3 text-amber-600" />}
                          {isRegular && <Heart className="w-3 h-3 text-purple-600" />}
                          {cust.loyaltyTier}
                        </span>
                      </td>

                      {/* Orders */}
                      <td className="py-4 px-6 text-center font-bold text-gray-800">
                        {cust.totalOrders}
                      </td>

                      {/* Lifetime Spend */}
                      <td className="py-4 px-6 text-right font-black text-gray-900">
                        ${cust.lifetimeSpend.toFixed(2)}
                      </td>

                      {/* AOV */}
                      <td className="py-4 px-6 text-right font-semibold text-emerald-700">
                        ${cust.averageOrderValue.toFixed(2)}
                      </td>

                      {/* Favorite Dishes */}
                      <td className="py-4 px-6">
                        {cust.favoriteItems.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap max-w-xs">
                            {cust.favoriteItems.map((dish, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-medium"
                              >
                                {dish}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Last Active */}
                      <td className="py-4 px-6 text-gray-500 text-[11px] whitespace-nowrap">
                        {new Date(cust.lastOrderAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Courtesy Credit Button */}
                      <td className="py-4 px-6 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setCreditAmount(isVip ? '15' : '10');
                            setCreditReason(
                              isVip
                                ? 'VIP loyalty appreciation reward'
                                : 'Courtesy hospitality credit'
                            );
                            setCreditResult(null);
                            setIssueError('');
                          }}
                          className="text-xs font-bold flex items-center gap-1 text-amber-700 border-amber-200 hover:bg-amber-50"
                        >
                          <Gift className="w-3.5 h-3.5 text-amber-500" />
                          Issue Credit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issue Courtesy Credit Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCustomer(null)}
          title={`Issue Courtesy Credit: ${selectedCustomer.name}`}
        >
          <div className="space-y-4">
            <div className="bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-xl text-xs space-y-1">
              <p className="font-bold text-amber-900">
                Granting instant wallet credit to {selectedCustomer.name} ({selectedCustomer.email})
              </p>
              <p className="text-amber-700 text-[11px]">
                This will generate a personalized 1-time coupon code and dispatch a push notification to their FeastFlow mobile app!
              </p>
            </div>

            {issueError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                {issueError}
              </div>
            )}

            {creditResult ? (
              <div className="space-y-3 text-center py-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-gray-900">
                    Courtesy Credit Dispatched!
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Push notification sent to {creditResult.customerName}.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl inline-block">
                  <span className="text-[11px] font-bold text-gray-400 block mb-1 uppercase tracking-wider">
                    Assigned Promo Code
                  </span>
                  <span className="font-mono font-black text-xl text-brand-600 tracking-wider">
                    {creditResult.promoCode}
                  </span>
                  <span className="text-xs text-gray-500 block mt-1">
                    Value: ${creditResult.amount.toFixed(2)} (Valid for 60 days)
                  </span>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => setSelectedCustomer(null)}
                    className="bg-brand-500 hover:bg-brand-600 text-white font-bold w-full"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Credit Amount ($)
                  </label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {['5', '10', '15', '25'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCreditAmount(amt)}
                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                          creditAmount === amt
                            ? 'bg-brand-500 text-white border-brand-500'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-gray-300 rounded-xl p-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Custom amount"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Reason / Personal Note
                  </label>
                  <select
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-gray-300 rounded-xl p-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 mb-2"
                  >
                    <option value="VIP loyalty appreciation reward">
                      VIP loyalty appreciation reward
                    </option>
                    <option value="Apology for order delivery delay">
                      Apology for order delivery delay
                    </option>
                    <option value="Resolution for kitchen substitution / missing item">
                      Resolution for kitchen substitution / missing item
                    </option>
                    <option value="Welcome back hospitality perk">
                      Welcome back hospitality perk
                    </option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <Button variant="outline" onClick={() => setSelectedCustomer(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleIssueCredit}
                    disabled={isIssuing || !creditAmount}
                    className="bg-brand-500 hover:bg-brand-600 text-white font-bold"
                  >
                    {isIssuing ? 'Issuing Credit...' : 'Confirm & Dispatch Credit'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
