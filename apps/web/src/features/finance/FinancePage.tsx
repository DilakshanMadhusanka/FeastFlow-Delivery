import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  Percent,
  Wallet,
  ArrowUpRight,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  Store,
  CreditCard,
  Banknote,
  Search,
  FileText,
  Printer,
  Calculator,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { financeService } from '../../services/finance.service';
import { FinancialSummary, FinancialLedgerItem } from '../../types';
import { UserRole } from '@food-delivery/shared';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Navbar } from '../../components/layout/Navbar';

export const FinancePage: React.FC = () => {
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

  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [bankAccount, setBankAccount] = useState('Chase Merchant ACH (••••4821)');
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState('');

  const exportCsv = () => {
    if (!ledgerItems || ledgerItems.length === 0) {
      alert('No ledger records to export');
      return;
    }
    const headers = [
      'Order Number',
      'Date Placed',
      'Restaurant',
      'Branch City',
      'Customer Name',
      'Customer Email',
      'Payment Method',
      'Food Subtotal ($)',
      'Commission Rate',
      'Platform Commission ($)',
      'Net Merchant Revenue ($)',
      'Delivery Fee ($)',
      'Service Fee ($)',
      'Tip ($)',
      'Total Amount ($)',
      'Settlement Status',
    ];

    const rows = ledgerItems.map((item) => [
      `"${item.orderNumber}"`,
      `"${new Date(item.placedAt).toISOString()}"`,
      `"${item.restaurant.name}"`,
      `"${item.restaurant.city || ''}"`,
      `"${item.customer.name}"`,
      `"${item.customer.email}"`,
      `"${item.paymentMethod}"`,
      Number(item.subtotal || 0).toFixed(2),
      `${(Number(item.commissionRate || 0.15) * 100).toFixed(0)}%`,
      Number(item.platformCommission || 0).toFixed(2),
      Number(item.netMerchantAmount || 0).toFixed(2),
      Number(item.deliveryFee || 0).toFixed(2),
      Number(item.serviceFee || 0).toFixed(2),
      Number(item.tipAmount || 0).toFixed(2),
      Number(item.totalAmount || 0).toFixed(2),
      `"${item.settlementStatus || 'Settled'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `feastflow_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // Fetch financial KPI summary
  const {
    data: summary,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
    isRefetching,
  } = useQuery<FinancialSummary>({
    queryKey: ['financeSummary', queryRestaurantId],
    queryFn: () => financeService.getSummary(queryRestaurantId),
    staleTime: 30 * 1000,
  });

  // Fetch financial ledger
  const { data: ledgerData, isLoading: isLoadingLedger } = useQuery({
    queryKey: ['financeLedger', queryRestaurantId],
    queryFn: () => financeService.getLedger({ restaurantId: queryRestaurantId, limit: 100 }),
    staleTime: 30 * 1000,
  });

  const payoutMutation = useMutation({
    mutationFn: (input: { restaurantId: string; amount: number; bankAccount?: string }) =>
      financeService.processPayout(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
      setPayoutSuccessMsg(`Payout batch ${data.payoutId} for $${data.amount.toFixed(2)} initiated!`);
      setTimeout(() => {
        setShowPayoutModal(false);
        setPayoutSuccessMsg('');
      }, 2500);
    },
  });

  const handlePayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetRestId = isViewingAll ? restaurants[0]?.id : selectedBranchId;
    if (!targetRestId) return;

    payoutMutation.mutate({
      restaurantId: targetRestId,
      amount: parseFloat(payoutAmount) || (summary?.availablePayoutBalance || 0),
      bankAccount,
    });
  };

  const ledgerItems = ledgerData?.items || [];

  return (
    <div className="space-y-6">
      <Navbar
        title="Financial Settlement & Revenue Ledger"
        onRefresh={refetchSummary}
        isRefreshing={isRefetching}
      />

      {/* Scope Switcher */}
      {(isAdmin || restaurants.length > 1) && (
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
            <Store className="w-4 h-4 text-brand-500" />
            <span>Settlement Entity:</span>
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
                <span>🌐 Platform Wide (All Stores)</span>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Gross Sales */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold mb-3">
            <DollarSign className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Gross Food Sales</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">
            ${Number(summary?.grossSales || 0).toFixed(2)}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
            Across {summary?.totalDeliveredOrders || 0} completed orders
          </p>
        </div>

        {/* Platform 15% Commission */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold mb-3">
            <Percent className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Platform Take-rate</p>
          <p className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-0.5">
            ${Number(summary?.platformCommission || 0).toFixed(2)}
          </p>
          <p className="text-[11px] text-orange-500/80 dark:text-orange-400/80 font-bold mt-1">
            Standard 15.0% commission
          </p>
        </div>

        {/* Net Merchant Revenue */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold mb-3">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Net Merchant Sales</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            ${Number(summary?.netMerchantRevenue || 0).toFixed(2)}
          </p>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-bold mt-1">85% net merchant payout</p>
        </div>

        {/* Driver Tips & Deliveries */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold mb-3">
            <Wallet className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Driver Payouts</p>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
            ${Number(summary?.driverPayouts || 0).toFixed(2)}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
            ${Number(summary?.totalTips || 0).toFixed(2)} tips + fees
          </p>
        </div>

        {/* Available Payout Balance */}
        <div className="bg-gradient-to-br from-brand-500 to-brand-600 text-white p-5 rounded-2xl shadow-md shadow-brand-500/20 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-brand-100 uppercase tracking-wider">
              Settlement Balance
            </p>
            <p className="text-2xl font-black mt-0.5">
              ${Number(summary?.availablePayoutBalance || 0).toFixed(2)}
            </p>
          </div>
          <Button
            size="sm"
            className="w-full bg-white text-brand-700 hover:bg-brand-50 font-black shadow-sm mt-3"
            onClick={() => {
              setPayoutAmount((summary?.availablePayoutBalance || 0).toString());
              setShowPayoutModal(true);
            }}
          >
            Process Payout <ArrowUpRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wide">
              Settled Orders Ledger
            </h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 font-medium">
              Order-level commission calculation, sales tax breakdown, and transaction ledger
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTaxModal(true)}
              className="text-xs font-bold flex items-center gap-1.5 text-gray-700 dark:text-slate-200"
            >
              <Calculator className="w-3.5 h-3.5 text-purple-600" />
              Sales Tax & 1099-K
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              className="text-xs font-bold flex items-center gap-1.5 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-900/60 hover:bg-brand-50 dark:hover:bg-brand-950/30"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV Ledger
            </Button>
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-gray-200/60 dark:border-slate-700">
              {ledgerItems.length} Settled
            </span>
          </div>
        </div>

        {isLoadingLedger ? (
          <div className="p-12 text-center text-xs text-gray-500 dark:text-slate-400 font-semibold">Loading ledger...</div>
        ) : ledgerItems.length === 0 ? (
          <div className="p-16 text-center">
            <DollarSign className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">No settled transactions yet</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Completed and delivered orders will automatically generate platform settlements.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/60 text-[11px] font-extrabold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Order #</th>
                  <th className="py-3.5 px-4">Restaurant</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4 text-right">Food Subtotal</th>
                  <th className="py-3.5 px-4 text-right text-orange-600 dark:text-orange-400">Platform 15%</th>
                  <th className="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400">Net Merchant</th>
                  <th className="py-3.5 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                {ledgerItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 px-5">
                      <span className="font-extrabold text-gray-900 dark:text-white block">#{item.orderNumber}</span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500">
                        {new Date(item.placedAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-gray-900 dark:text-white block">{item.restaurant.name}</span>
                      <span className="text-[10px] text-gray-500 dark:text-slate-400">{item.restaurant.city} Branch</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-medium text-gray-800 dark:text-slate-200 block">{item.customer.name}</span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500">{item.customer.email}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1 font-semibold text-gray-700 dark:text-slate-300">
                        {item.paymentMethod === 'COD' ? (
                          <Banknote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        )}
                        <span>{item.paymentMethod}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-gray-900 dark:text-white">
                      ${Number(item.subtotal || 0).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-orange-600 dark:text-orange-400">
                      -${Number(item.platformCommission || 0).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                      ${Number(item.netMerchantAmount || 0).toFixed(2)}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Settled
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Processing Modal */}
      {showPayoutModal && (
        <Modal
          isOpen={showPayoutModal}
          onClose={() => setShowPayoutModal(false)}
          title="Initiate Merchant Payout Settlement"
          maxWidth="sm"
        >
          <form onSubmit={handlePayoutSubmit} className="space-y-4">
            {payoutSuccessMsg ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold text-center">
                ✅ {payoutSuccessMsg}
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Transfer cleared earnings directly to your verified commercial checking account via
                  direct ACH disbursement.
                </p>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1">
                    Payout Amount ($ USD)*
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    className="w-full text-base font-black p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                    Available balance: ${Number(summary?.availablePayoutBalance || 0).toFixed(2)}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1">
                    Destination Account
                  </label>
                  <select
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="Chase Merchant ACH (••••4821)">
                      Chase Merchant Checking (••••4821)
                    </option>
                    <option value="Bank of America Commercial (••••9920)">
                      Bank of America Commercial (••••9920)
                    </option>
                  </select>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
                  <Button variant="secondary" onClick={() => setShowPayoutModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" isLoading={payoutMutation.isPending}>
                    Confirm Transfer
                  </Button>
                </div>
              </>
            )}
          </form>
        </Modal>
      )}

      {/* Sales Tax & Accounting Summary Modal */}
      {showTaxModal && (
        <Modal
          isOpen={showTaxModal}
          onClose={() => setShowTaxModal(false)}
          title="Merchant Tax & Form 1099-K Settlement Statement"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between border border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Commercial Tax Report
                </span>
                <h4 className="text-base font-black text-white">
                  {isViewingAll ? 'Platform Wide Consolidated' : restaurant?.name || 'Store Merchant'}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tax Year: {new Date().getFullYear()} • Fiscal Period: Q1 - Q4 YTD
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400 block">TIN / EIN</span>
                <span className="font-mono font-bold text-xs text-slate-200">FF-849-019-TX</span>
              </div>
            </div>

            {/* Accounting Breakdown Table */}
            <div className="bg-gray-50 dark:bg-slate-800/80 p-4 rounded-xl border border-gray-200 dark:border-slate-700 space-y-2.5">
              <div className="flex justify-between items-center py-1 border-b border-gray-200/80 dark:border-slate-700">
                <span className="text-gray-600 dark:text-slate-300 font-semibold">Gross Food & Beverage Subtotal:</span>
                <span className="font-black text-gray-900 dark:text-white">
                  ${Number(summary?.totalVolume || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-200/80 dark:border-slate-700">
                <span className="text-gray-600 dark:text-slate-300 font-semibold">
                  Estimated State & Local Sales Tax (8.25%):
                </span>
                <span className="font-black text-amber-700 dark:text-amber-400">
                  ${(Number(summary?.totalVolume || 0) * 0.0825).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-200/80 dark:border-slate-700">
                <span className="text-gray-600 dark:text-slate-300 font-semibold">Platform Commission (15%):</span>
                <span className="font-black text-rose-600 dark:text-rose-400">
                  -${(Number(summary?.totalVolume || 0) * 0.15).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-200/80 dark:border-slate-700">
                <span className="text-gray-600 dark:text-slate-300 font-semibold">Tips Passed Through to Couriers:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  ${Number(summary?.totalTips || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 text-sm">
                <span className="font-black text-gray-900 dark:text-white">Net Merchant Earnings Disbursable:</span>
                <span className="font-black text-emerald-700 dark:text-emerald-400">
                  ${Number(summary?.netMerchantRevenue || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300 rounded-xl text-[11px] leading-relaxed">
              💡 <strong>Tax Compliance Notice:</strong> Marketplace Facilitator laws apply. FeastFlow
              collects and remits state sales tax directly to tax authorities on qualifying orders where
              applicable.
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-300"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Save PDF
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowTaxModal(false)}
                className="text-xs font-bold"
              >
                Close Statement
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
