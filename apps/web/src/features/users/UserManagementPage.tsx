import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Smartphone,
  Bike,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  KeyRound,
  Car,
  AlertCircle,
  Clock,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import {
  adminUserService,
  AdminManagedUser,
  CreateAdminUserInput,
} from '../../services/admin-user.service';

export const UserManagementPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<'ALL' | 'CUSTOMER' | 'DELIVERY_DRIVER'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [successModalData, setSuccessModalData] = useState<{
    user: AdminManagedUser;
    plainPassword: string;
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateAdminUserInput>({
    name: '',
    email: '',
    password: 'Password@123',
    phone: '',
    role: 'CUSTOMER',
    isEmailVerified: true,
    isActive: true,
    vehicleType: 'MOTORCYCLE',
    licensePlate: '',
    isVerified: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['admin-users', searchTerm, selectedRole],
    queryFn: () =>
      adminUserService.listUsers({
        search: searchTerm || undefined,
        role: selectedRole === 'ALL' ? undefined : selectedRole,
        limit: 50,
      }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (input: CreateAdminUserInput) => adminUserService.createUser(input),
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSuccessModalData({
        user: newUser,
        plainPassword: formData.password,
      });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to create user account';
      setFormError(msg);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      adminUserService.updateUserStatus(userId, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const toggleDriverVerifiedMutation = useMutation({
    mutationFn: ({ userId, isVerified }: { userId: string; isVerified: boolean }) =>
      adminUserService.updateUserStatus(userId, { isVerified }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => adminUserService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: 'Password@123',
      phone: '',
      role: 'CUSTOMER',
      isEmailVerified: true,
      isActive: true,
      vehicleType: 'MOTORCYCLE',
      licensePlate: '',
      isVerified: true,
    });
    setFormError(null);
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'Pass@';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: pass }));
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Please enter user full name.');
      return;
    }
    if (!formData.email.trim()) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    createMutation.mutate({
      ...formData,
      email: formData.email.trim().toLowerCase(),
      name: formData.name.trim(),
      phone: formData.phone?.trim() || undefined,
      licensePlate: formData.licensePlate?.trim() || undefined,
    });
  };

  const metrics = data?.metrics || {
    totalUsers: 0,
    totalCustomers: 0,
    totalDrivers: 0,
    verifiedDrivers: 0,
  };

  const usersList = data?.users || [];

  return (
    <div className="flex-1 min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col transition-colors">
      <Navbar
        title="Mobile App Users Management"
        onRefresh={() => refetch()}
        isRefreshing={isRefetching}
      />

      <main className="p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 text-xs font-bold rounded-lg border border-brand-100 dark:border-brand-900/60">
                System Admin Provisioning
              </span>
              <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg border border-blue-100 dark:border-blue-900/60">
                📱 FeastFlow Native Mobile App
              </span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white mt-2">Mobile App User Provisioning</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Create and manage Diner (`CUSTOMER`) and Courier Driver (`DELIVERY_DRIVER`) accounts with instant mobile sign-in.
            </p>
          </div>

          <Button
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-brand-500/25 shrink-0"
          >
            <UserPlus className="w-5 h-5" />
            + Provision Mobile App User
          </Button>
        </div>

        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">Total Accounts</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">{metrics.totalUsers}</h3>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">Platform registered</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">Mobile Diners</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">{metrics.totalCustomers}</h3>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">Active food ordering</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">Courier Drivers</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">{metrics.totalDrivers}</h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Delivery fleet capacity</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">Verified Fleet</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">{metrics.verifiedDrivers}</h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">Ready for radar dispatch</p>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedRole('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedRole === 'ALL'
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              All App Users ({metrics.totalUsers})
            </button>
            <button
              onClick={() => setSelectedRole('CUSTOMER')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                selectedRole === 'CUSTOMER'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              📱 Customers ({metrics.totalCustomers})
            </button>
            <button
              onClick={() => setSelectedRole('DELIVERY_DRIVER')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                selectedRole === 'DELIVERY_DRIVER'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              🛵 Courier Drivers ({metrics.totalDrivers})
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/60 text-gray-500 dark:text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">
                  <th className="py-4 px-6">User / Identity</th>
                  <th className="py-4 px-6">Mobile Role</th>
                  <th className="py-4 px-6">Contact Phone</th>
                  <th className="py-4 px-6">Mobile App Status</th>
                  <th className="py-4 px-6">Activity</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-500 mb-2" />
                      Loading users directory...
                    </td>
                  </tr>
                ) : usersList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-400">
                      <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
                      <p className="font-bold text-gray-600 dark:text-slate-300">No users found</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                        Try adjusting your search criteria or click "+ Provision Mobile App User".
                      </p>
                    </td>
                  </tr>
                ) : (
                  usersList.map((user) => {
                    const isDriver = user.roles.includes('DELIVERY_DRIVER');
                    const isCustomer = user.roles.includes('CUSTOMER');
                    const isAdminUser = user.roles.includes('ADMIN');

                    return (
                      <tr key={user.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/60 transition-colors">
                        {/* User / Identity */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-500 to-amber-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                              {user.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 dark:text-white truncate">{user.name}</p>
                              <p className="text-xs text-gray-400 dark:text-slate-400 truncate flex items-center gap-1">
                                <Mail className="w-3 h-3 shrink-0" />
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Mobile Role */}
                        <td className="py-4 px-6">
                          {isDriver ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Bike className="w-3.5 h-3.5" />
                                Courier Driver
                              </span>
                              {user.driverProfile && (
                                <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                                  <span className="font-semibold text-gray-700">
                                    {user.driverProfile.vehicleType}
                                  </span>
                                  {user.driverProfile.licensePlate && (
                                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-mono">
                                      {user.driverProfile.licensePlate}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : isCustomer ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Smartphone className="w-3.5 h-3.5" />
                              Mobile Diner
                            </span>
                          ) : isAdminUser ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              👑 Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                              {user.roles.join(', ')}
                            </span>
                          )}
                        </td>

                        {/* Contact Phone */}
                        <td className="py-4 px-6">
                          {user.phone ? (
                            <div className="flex items-center gap-1.5 text-xs text-gray-700">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span className="font-mono">{user.phone}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300 italic">No phone set</span>
                          )}
                        </td>

                        {/* Status Badges */}
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {user.isActive ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                <CheckCircle2 className="w-3 h-3" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                                <XCircle className="w-3 h-3" />
                                Suspended
                              </span>
                            )}

                            {user.isEmailVerified && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                Verified Email
                              </span>
                            )}

                            {isDriver && user.driverProfile && (
                              <button
                                onClick={() =>
                                  toggleDriverVerifiedMutation.mutate({
                                    userId: user.id,
                                    isVerified: !user.driverProfile?.isVerified,
                                  })
                                }
                                title="Click to toggle driver verification"
                                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md transition-all ${
                                  user.driverProfile.isVerified
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-gray-100 text-gray-400 hover:bg-amber-50 hover:text-amber-700'
                                }`}
                              >
                                <ShieldCheck className="w-3 h-3" />
                                {user.driverProfile.isVerified ? 'Fleet Verified' : 'Unverified'}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Activity */}
                        <td className="py-4 px-6 text-xs text-gray-500">
                          <p className="font-semibold text-gray-700">{user.ordersCount} orders</p>
                          <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 shrink-0" />
                            {new Date(user.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Copy Credentials Prompt */}
                            <button
                              onClick={() => {
                                const creds = `FeastFlow Mobile App Login\nEmail: ${user.email}\nRole: ${user.roles.join(', ')}`;
                                handleCopyText(creds, user.id);
                              }}
                              title="Copy mobile app sign-in credentials"
                              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              {copiedId === user.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-700">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-gray-400" />
                                  <span>Copy Info</span>
                                </>
                              )}
                            </button>

                            {/* Toggle Active Button */}
                            <button
                              onClick={() =>
                                toggleStatusMutation.mutate({
                                  userId: user.id,
                                  isActive: !user.isActive,
                                })
                              }
                              title={user.isActive ? 'Suspend account' : 'Reactivate account'}
                              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                                user.isActive
                                  ? 'border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                              }`}
                            >
                              {user.isActive ? (
                                <XCircle className="w-4 h-4" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Provision Mobile User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Provision New Mobile App User"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. Mobile App Role Selector */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
              Select Mobile App Role *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setFormData((prev) => ({ ...prev, role: 'CUSTOMER' }))}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.role === 'CUSTOMER'
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 shadow-sm'
                    : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
                  <Smartphone className="w-4 h-4" />
                  👤 Mobile Customer
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Food discovery, cart checkout, and real-time delivery tracking on iOS/Android/Web.
                </p>
              </div>

              <div
                onClick={() => setFormData((prev) => ({ ...prev, role: 'DELIVERY_DRIVER' }))}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.role === 'DELIVERY_DRIVER'
                    ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 shadow-sm'
                    : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <Bike className="w-4 h-4" />
                  🛵 Courier Driver
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Accept nearby delivery radar jobs, turn-by-turn routing, and proof-of-delivery photos.
                </p>
              </div>
            </div>
          </div>

          {/* 2. Core Profile Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Sarah Connor"
                required
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Email Address *</label>
              <input
                type="email"
                placeholder="e.g. sarah.connor@feastflow.com"
                required
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Phone Number (E.164)
              </label>
              <input
                type="text"
                placeholder="e.g. +15554329876"
                value={formData.phone || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300">Initial Password *</label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Generate
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* 3. Driver Specific Fleet Fields */}
          {formData.role === 'DELIVERY_DRIVER' && (
            <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-bold text-xs">
                <Bike className="w-4 h-4" />
                Courier Fleet Specifications
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Primary Vehicle Type
                  </label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, vehicleType: e.target.value as any }))
                    }
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="MOTORCYCLE">🛵 Motorcycle / Scooter</option>
                    <option value="BICYCLE">🚲 Bicycle / E-Bike</option>
                    <option value="SCOOTER">🛴 Electric Scooter</option>
                    <option value="CAR">🚗 Passenger Car</option>
                    <option value="VAN">🚐 Delivery Van</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    License Plate / Fleet ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NYC-789-DL"
                    value={formData.licensePlate || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, licensePlate: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm uppercase text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isVerified"
                  checked={formData.isVerified}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, isVerified: e.target.checked }))
                  }
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="isVerified" className="text-xs font-medium text-emerald-900 dark:text-emerald-300 cursor-pointer">
                  Pre-verify courier documents so they can immediately accept delivery jobs on the radar
                </label>
              </div>
            </div>
          )}

          {/* 4. Verification Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isEmailVerified"
              checked={formData.isEmailVerified}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, isEmailVerified: e.target.checked }))
              }
              className="rounded text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isEmailVerified" className="text-xs text-gray-600 dark:text-slate-400 cursor-pointer">
              Mark email as verified (allows immediate mobile login without email activation delay)
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-brand-500/20"
            >
              {createMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Provisioning...
                </div>
              ) : (
                'Provision Account'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Success Notification & Credentials Modal */}
      {successModalData && (
        <Modal
          isOpen={true}
          onClose={() => setSuccessModalData(null)}
          title="🎉 Account Successfully Provisioned!"
          maxWidth="md"
        >
          <div className="p-6 space-y-5">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-emerald-950 text-sm">
                  {successModalData.user.name} is ready for mobile login!
                </h4>
                <p className="text-xs text-emerald-800 mt-1">
                  The account has been created and pre-verified. The user can immediately sign in to the FeastFlow Mobile App.
                </p>
              </div>
            </div>

            {/* Credentials Card */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="font-bold text-gray-500 uppercase text-[10px]">Mobile Sign-In Credentials</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-sans text-[10px] font-bold">
                  {successModalData.user.roles.join(', ')}
                </span>
              </div>

              <div>
                <p className="text-[11px] text-gray-400">Email Address:</p>
                <p className="font-bold text-gray-900 text-sm mt-0.5">{successModalData.user.email}</p>
              </div>

              <div>
                <p className="text-[11px] text-gray-400">Password:</p>
                <p className="font-bold text-brand-600 text-sm mt-0.5">{successModalData.plainPassword}</p>
              </div>

              <div>
                <p className="text-[11px] text-gray-400">Mobile App URL:</p>
                <p className="text-gray-600 mt-0.5">http://localhost:8081</p>
              </div>
            </div>

            {/* Copy Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                onClick={() => {
                  const payload = `FeastFlow Mobile App Credentials\nRole: ${successModalData.user.roles.join(', ')}\nEmail: ${successModalData.user.email}\nPassword: ${successModalData.plainPassword}\nMobile App: http://localhost:8081`;
                  handleCopyText(payload, 'modal-creds');
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
              >
                {copiedId === 'modal-creds' ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Credentials to Share
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
