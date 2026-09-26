import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  KeyRound,
  ShieldCheck,
  Clock,
  Trash2,
  Eye,
  EyeOff,
  ChefHat,
  Sparkles,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  RefreshCw,
  Search,
  Lock,
} from 'lucide-react';
import { staffService, StaffMember } from '../../services/staff.service';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';

export const StaffManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { restaurant } = useAuthStore();
  const restaurantId = restaurant?.id || 'all';

  const [showAddModal, setShowAddModal] = useState(false);
  const [showPinTestModal, setShowPinTestModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  // Add staff form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'LINE_COOK' | 'CASHIER' | 'MANAGER' | 'OWNER'>('LINE_COOK');
  const [stationPin, setStationPin] = useState('1234');
  const [formError, setFormError] = useState('');

  // PIN test terminal state
  const [testPin, setTestPin] = useState('');
  const [pinVerificationResult, setPinVerificationResult] = useState<any | null>(null);
  const [pinTestError, setPinTestError] = useState('');

  // 1. Fetch staff
  const {
    data: staffList = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['staffList', restaurantId],
    queryFn: () => staffService.getStaff(restaurantId),
  });

  // 2. Mutations
  const addMutation = useMutation({
    mutationFn: staffService.addStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || err.message || 'Failed to add staff member');
    },
  });

  const toggleShiftMutation = useMutation({
    mutationFn: (id: string) => staffService.toggleShift(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => staffService.removeStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
    },
  });

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setRole('LINE_COOK');
    setStationPin(Math.floor(1000 + Math.random() * 9000).toString());
    setFormError('');
  };

  const handleGeneratePin = () => {
    setStationPin(Math.floor(1000 + Math.random() * 9000).toString());
  };

  const togglePinReveal = (id: string) => {
    setRevealedPins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTestPinSubmit = async () => {
    setPinTestError('');
    setPinVerificationResult(null);
    try {
      const res = await staffService.verifyPin(testPin, restaurantId);
      setPinVerificationResult(res);
    } catch (err: any) {
      setPinTestError(err.response?.data?.message || 'Invalid Station PIN');
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setFormError('Name and email are required');
      return;
    }
    if (stationPin.length !== 4) {
      setFormError('Station PIN must be exactly 4 digits');
      return;
    }

    addMutation.mutate({
      restaurantId,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      role,
      stationPin,
    });
  };

  const filteredStaff = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onShiftCount = staffList.filter((s) => s.isOnShift).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Team & Kitchen Staff
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                {onShiftCount} Active On Shift
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Manage kitchen crew, cashiers, role-based access, and secure 4-digit station PINs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => {
              setTestPin('');
              setPinVerificationResult(null);
              setPinTestError('');
              setShowPinTestModal(true);
            }}
            className="flex items-center gap-1.5 h-11"
          >
            <KeyRound className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Test Station PIN
          </Button>

          <Button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold flex items-center gap-1.5 h-11"
          >
            <UserPlus className="w-4 h-4" />
            Add Staff Member
          </Button>
        </div>
      </div>

      {/* Search & Stats Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by name, email, or role..."
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs placeholder-gray-400 dark:placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-slate-400">
          <span>Total Staff: {staffList.length}</span>
          <span>•</span>
          <span className="text-emerald-600 dark:text-emerald-400">On Shift: {onShiftCount}</span>
          <span>•</span>
          <span className="text-gray-400 dark:text-slate-500">Off Shift: {staffList.length - onShiftCount}</span>
        </div>
      </div>

      {/* Staff Grid Cards */}
      {isLoading ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
          <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-gray-600 dark:text-slate-300">Loading team directory...</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 p-8">
          <ChefHat className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-extrabold text-gray-700 dark:text-slate-200 text-base">No staff members found</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
            Click "+ Add Staff Member" to register kitchen cooks, expeditors, or cashiers.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStaff.map((staff) => {
            const isRevealed = !!revealedPins[staff.id];
            const roleColor =
              staff.role === 'OWNER'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                : staff.role === 'MANAGER'
                ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/60'
                : staff.role === 'LINE_COOK'
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60';

            return (
              <div
                key={staff.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center font-black text-sm text-gray-800 dark:text-slate-200">
                        {staff.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-gray-900 dark:text-white leading-tight">
                          {staff.name}
                        </h3>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${roleColor}`}
                        >
                          {staff.role.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Shift Status Badge */}
                    <button
                      onClick={() => toggleShiftMutation.mutate(staff.id)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                        staff.isOnShift
                          ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          staff.isOnShift ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400 dark:bg-slate-500'
                        }`}
                      />
                      {staff.isOnShift ? 'ON SHIFT' : 'OFF SHIFT'}
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-500 dark:text-slate-400 pt-2 border-t border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                      <span className="truncate">{staff.email}</span>
                    </div>
                    {staff.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                        <span>{staff.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom PIN & Actions */}
                <div className="pt-4 mt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500">PIN:</span>
                    <span className="font-mono font-bold text-xs bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 tracking-widest">
                      {isRevealed ? staff.stationPin : '••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => togglePinReveal(staff.id)}
                      className="p-1 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 rounded transition-colors"
                      title={isRevealed ? 'Hide PIN' : 'Show PIN'}
                    >
                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Remove ${staff.name} from staff directory?`)) {
                        removeMutation.mutate(staff.id);
                      }
                    }}
                    className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                    title="Remove Staff"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <Modal isOpen={true} onClose={() => setShowAddModal(false)} title="Add Staff Member">
          <form onSubmit={handleAddSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Marco Rossi"
                className="w-full text-xs font-medium bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-2.5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. marco@feastflow.com"
                className="w-full text-xs font-medium bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-2.5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555-0199"
                  className="w-full text-xs font-medium bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-2.5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="w-full text-xs font-semibold bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-2.5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="LINE_COOK">Line Cook</option>
                  <option value="CASHIER">Cashier / Front Desk</option>
                  <option value="MANAGER">Kitchen Manager</option>
                  <option value="OWNER">Store Owner</option>
                </select>
              </div>
            </div>

            {/* Station PIN input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                  Station 4-Digit PIN *
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePin}
                  className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Generate Random
                </button>
              </div>
              <input
                type="text"
                maxLength={4}
                required
                value={stationPin}
                onChange={(e) => setStationPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="4-digit PIN"
                className="w-full text-center tracking-widest font-mono font-bold text-lg bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                Used to unlock Kitchen Display System stations and order bump bars.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
              <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addMutation.isPending}
                className="bg-brand-500 hover:bg-brand-600 text-white font-bold"
              >
                {addMutation.isPending ? 'Adding Member...' : 'Save Staff Member'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Test Station PIN Terminal Modal */}
      {showPinTestModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowPinTestModal(false)}
          title="Terminal Station PIN Lock Simulator"
        >
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                Kitchen Terminal PIN Verification
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Enter any staff member's 4-digit PIN to simulate terminal authorization.
              </p>
            </div>

            <div className="max-w-[200px] mx-auto">
              <input
                type="password"
                maxLength={4}
                value={testPin}
                onChange={(e) => setTestPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="• • • •"
                className="w-full text-center tracking-[0.5em] font-mono font-black text-2xl bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Quick keypad */}
            <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    if (val === 'C') setTestPin('');
                    else if (val === '⌫') setTestPin((p) => p.slice(0, -1));
                    else if (testPin.length < 4) setTestPin((p) => p + val);
                  }}
                  className="py-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg font-bold text-sm text-gray-800 dark:text-white transition-colors"
                >
                  {val}
                </button>
              ))}
            </div>

            {pinTestError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                {pinTestError}
              </div>
            )}

            {pinVerificationResult && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Access Granted: {pinVerificationResult.name} ({pinVerificationResult.role})
              </div>
            )}

            <div className="flex justify-center gap-2 pt-2">
              <Button
                onClick={handleTestPinSubmit}
                disabled={testPin.length !== 4}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold w-full"
              >
                Verify PIN Code
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
