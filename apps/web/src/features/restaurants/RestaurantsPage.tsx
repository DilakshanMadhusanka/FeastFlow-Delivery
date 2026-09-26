import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Store,
  MapPin,
  Phone,
  Mail,
  Clock,
  DollarSign,
  Bike,
  Star,
  CheckCircle2,
  XCircle,
  ChefHat,
  ShoppingBag,
  BarChart3,
  Settings,
  LayoutGrid,
  List,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { restaurantService } from '../../services/restaurant.service';
import { menuService } from '../../services/menu.service';
import { Restaurant, CreateRestaurantInput } from '../../types';
import { UserRole } from '@food-delivery/shared';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Navbar } from '../../components/layout/Navbar';

export const RestaurantsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, setRestaurant } = useAuthStore();
  const isAdmin = Boolean(
    user?.roles?.includes(UserRole.ADMIN) || user?.roles?.includes('ADMIN' as any)
  );

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State for Add Restaurant Modal
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('New York');
  const [deliveryFeeBase, setDeliveryFeeBase] = useState('2.50');
  const [estimatedDeliveryMin, setEstimatedDeliveryMin] = useState('25');
  const [estimatedDeliveryMax, setEstimatedDeliveryMax] = useState('45');
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState('10');
  const [minimumOrderAmount, setMinimumOrderAmount] = useState('0.00');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [formError, setFormError] = useState('');

  // Fetch all restaurants
  const {
    data: rawRestaurants = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['myRestaurants'],
    queryFn: () => restaurantService.getMyRestaurants(),
    staleTime: 30 * 1000,
  });

  const restaurants: Restaurant[] = Array.isArray(rawRestaurants) ? rawRestaurants : [];

  // Fetch categories for cuisine assignment
  const { data: globalCategories = [] } = useQuery({
    queryKey: ['globalCategories'],
    queryFn: () => menuService.getCategories(),
    staleTime: 5 * 60 * 1000,
  });

  // Create restaurant mutation
  const createMutation = useMutation({
    mutationFn: (input: CreateRestaurantInput) => restaurantService.createRestaurant(input),
    onSuccess: (newRestaurant) => {
      queryClient.invalidateQueries({ queryKey: ['myRestaurants'] });
      // Update auth store with refreshed restaurants list
      const updatedList = [...restaurants, newRestaurant];
      useAuthStore.getState().setRestaurants(updatedList);

      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || err.message || 'Failed to create restaurant');
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setPhone('');
    setEmail('');
    setStreet('');
    setCity('New York');
    setDeliveryFeeBase('2.50');
    setEstimatedDeliveryMin('25');
    setEstimatedDeliveryMax('45');
    setDeliveryRadiusKm('10');
    setMinimumOrderAmount('0.00');
    setSelectedCategoryIds([]);
    setFormError('');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Normalize phone number to international format
    let cleanPhone = phone.trim();
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.length === 10) {
        cleanPhone = `+1${cleanPhone}`;
      } else {
        cleanPhone = `+${cleanPhone}`;
      }
    }

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      phone: cleanPhone,
      email: email.trim() || undefined,
      street: street.trim(),
      city: city.trim(),
      deliveryFeeBase: parseFloat(deliveryFeeBase) || 2.5,
      estimatedDeliveryMin: parseInt(estimatedDeliveryMin, 10) || 25,
      estimatedDeliveryMax: parseInt(estimatedDeliveryMax, 10) || 45,
      deliveryRadiusKm: parseFloat(deliveryRadiusKm) || 10,
      minimumOrderAmount: parseFloat(minimumOrderAmount) || 0,
      categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
      isApproved: true,
    });
  };

  // Switch context and navigate helper
  const navigateToSection = (r: Restaurant, path: string) => {
    setRestaurant(r);
    navigate(path);
  };

  // Filter restaurants
  const filteredRestaurants = restaurants.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (r.name || '').toLowerCase().includes(q) ||
      (r.city || '').toLowerCase().includes(q) ||
      (r.street || '').toLowerCase().includes(q) ||
      (r.phone || '').toLowerCase().includes(q) ||
      (r.email ? r.email.toLowerCase().includes(q) : false);

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && r.isActive) ||
      (statusFilter === 'INACTIVE' && !r.isActive);

    return Boolean(matchesSearch && matchesStatus);
  });

  // High-level summary metrics
  const totalCount = restaurants.length;
  const activeCount = restaurants.filter((r) => r.isActive).length;
  const approvedCount = restaurants.filter((r) => r.isApproved).length;
  const uniqueCities = Array.from(new Set(restaurants.map((r) => r.city || '').filter(Boolean))).length;

  return (
    <div className="space-y-6">
      <Navbar
        title={isAdmin ? 'Platform Restaurants Directory' : 'My Registered Branches'}
        onRefresh={refetch}
        isRefreshing={isLoading}
      />

      {/* KPI Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              Total Restaurants
            </span>
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{totalCount}</span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block mt-1">
              {approvedCount} approved on platform
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              Active Branches
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{activeCount}</span>
            <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mt-1">
              Accepting live orders
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              Service Cities
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {uniqueCities}
            </span>
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block mt-1">
              Geographic coverage
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              Delivery Standard
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Bike className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">25-45m</span>
            <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mt-1">
              Target fulfillment window
            </span>
          </div>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, city, street, phone..."
            className="w-full pl-10 pr-4 py-2 text-xs font-medium rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder-gray-400 dark:placeholder-slate-500"
          />
        </div>

        {/* Filter Pills and View Mode Toggle */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-slate-800 p-1 rounded-xl border border-gray-200/80 dark:border-slate-700">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'INACTIVE'
                  ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-sm'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
              }`}
            >
              Inactive ({totalCount - activeCount})
            </button>
          </div>

          {/* Grid / Table View Toggle */}
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-slate-800 p-1 rounded-xl border border-gray-200/80 dark:border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Add Restaurant Button */}
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Restaurant
          </Button>
        </div>
      </div>

      {/* Directory Content */}
      {filteredRestaurants.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Store className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">No restaurants found</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No restaurants matching "${searchQuery}". Try adjusting your search query.`
              : 'No restaurants available in this view. Click "Add Restaurant" to create your first restaurant.'}
          </p>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="mt-4"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Restaurant
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Cards Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRestaurants.map((r) => (
            <div
              key={r.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col hover:border-brand-200 dark:hover:border-slate-700 transition-all"
            >
              {/* Card Banner / Header */}
              <div className="p-5 pb-3 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {r.logoUrl ? (
                      <img
                        src={r.logoUrl}
                        alt={r.name}
                        className="w-12 h-12 rounded-2xl object-cover border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-black text-lg flex items-center justify-center shrink-0 border border-brand-100 dark:border-brand-900/50">
                        {(r.name || 'R').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-900 dark:text-white leading-tight">
                        {r.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 shrink-0" />
                        <span className="truncate max-w-[180px]">
                          {r.street || ''}, {r.city || ''}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60'
                      }`}
                    >
                      {r.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {r.isApproved ? (
                      <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Approved
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </div>
                </div>

                {r.description && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 mt-2.5">
                    {r.description}
                  </p>
                )}
              </div>

              {/* Delivery Specs & Operational Info */}
              <div className="p-4 bg-gray-50/50 dark:bg-slate-800/40 flex-1 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Bike className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                    <span>
                      Fee: <strong className="text-gray-900 dark:text-white">${Number(r.deliveryFeeBase || 0).toFixed(2)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                    <span>
                      {r.estimatedDeliveryMin || 25}-{r.estimatedDeliveryMax || 45} mins
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                    <span className="truncate">{r.phone || 'No phone'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>
                      {Number(r.ratingAverage || 0).toFixed(1)}{' '}
                      <span className="text-gray-400 dark:text-slate-500">({r.ratingCount || 0})</span>
                    </span>
                  </div>
                </div>

                {/* Owner info if available */}
                {r.owner && (
                  <div className="pt-2 border-t border-gray-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400">
                    <span className="text-gray-400 dark:text-slate-500">Manager:</span>
                    <span className="font-semibold text-gray-800 dark:text-slate-200 truncate max-w-[180px]">
                      {r.owner.name} ({r.owner.email})
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Context Switch Navigation Actions */}
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 grid grid-cols-4 gap-1 text-[11px] font-bold">
                <button
                  onClick={() => navigateToSection(r, '/menu')}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl text-gray-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800 transition-colors"
                  title="Manage Menu"
                >
                  <ChefHat className="w-4 h-4" />
                  <span>Menu</span>
                </button>
                <button
                  onClick={() => navigateToSection(r, '/orders')}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl text-gray-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800 transition-colors"
                  title="View Live Orders"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Orders</span>
                </button>
                <button
                  onClick={() => navigateToSection(r, '/analytics')}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl text-gray-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800 transition-colors"
                  title="View Stats & KPIs"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Stats</span>
                </button>
                <button
                  onClick={() => navigateToSection(r, '/settings')}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl text-gray-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800 transition-colors"
                  title="Edit Settings"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/75 dark:bg-slate-800/70 border-b border-gray-100 dark:border-slate-800 text-gray-400 dark:text-slate-400 font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Restaurant</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Delivery Window & Fee</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Rating</th>
                  <th className="py-3.5 px-6 text-right">Quick Switch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filteredRestaurants.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-black text-sm flex items-center justify-center shrink-0 border border-brand-100 dark:border-brand-900/50">
                          {(r.name || 'R').slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-sm text-gray-900 dark:text-white">{r.name}</p>
                          <p className="text-gray-400 dark:text-slate-500 text-[11px] line-clamp-1 max-w-xs">
                            {r.description || r.slug}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <p className="font-bold text-gray-800 dark:text-slate-200">{r.city || 'N/A'}</p>
                      <p className="text-gray-400 dark:text-slate-500 text-[11px] truncate max-w-xs">{r.street || 'N/A'}</p>
                    </td>

                    <td className="py-4 px-4 font-medium text-gray-600 dark:text-slate-400">
                      <p className="font-semibold text-gray-900 dark:text-white">{r.phone || 'N/A'}</p>
                      <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">{r.email || 'No email'}</p>
                    </td>

                    <td className="py-4 px-4 font-semibold text-gray-700 dark:text-slate-300">
                      <p>${Number(r.deliveryFeeBase || 0).toFixed(2)} Base Fee</p>
                      <p className="text-[11px] text-gray-400 dark:text-slate-500">
                        {r.estimatedDeliveryMin || 25}-{r.estimatedDeliveryMax || 45} mins • {r.deliveryRadiusKm || 10} km
                      </p>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60'
                          }`}
                        >
                          {r.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-slate-500">
                          {r.isApproved ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1 font-bold text-gray-900 dark:text-white">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span>{Number(r.ratingAverage || 0).toFixed(1)}</span>
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 font-normal">
                          ({r.ratingCount || 0})
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigateToSection(r, '/menu')}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          Menu
                        </button>
                        <button
                          onClick={() => navigateToSection(r, '/orders')}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          Orders
                        </button>
                        <button
                          onClick={() => navigateToSection(r, '/settings')}
                          className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Settings"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add New Restaurant Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Restaurant"
        maxWidth="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-400 text-xs font-semibold">
              {formError}
            </div>
          )}

          {/* Section: Basic Identity */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
              1. General Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Restaurant Name <span className="text-brand-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tokyo Ramen House"
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Phone Number <span className="text-brand-500">*</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +12125550199 or 2125550199"
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500 font-medium"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. contact@tokyoramen.com"
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  City <span className="text-brand-500">*</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. New York"
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Street Address <span className="text-brand-500">*</span>
              </label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="e.g. 456 Broadway, Suite 2B"
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Description / Bio
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Authentic Japanese noodles, slow-simmered rich broths, and artisanal gyoza..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500 font-medium"
              />
            </div>
          </div>

          {/* Section: Delivery & Fulfillment Parameters */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-800">
            <h4 className="text-xs font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
              2. Delivery & Fulfillment Parameters
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Base Fee ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={deliveryFeeBase}
                  onChange={(e) => setDeliveryFeeBase(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Delivery Radius (km)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="50"
                  value={deliveryRadiusKm}
                  onChange={(e) => setDeliveryRadiusKm(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Min Prep Time (m)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={estimatedDeliveryMin}
                  onChange={(e) => setEstimatedDeliveryMin(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Max Prep Time (m)
                </label>
                <input
                  type="number"
                  min="10"
                  max="180"
                  value={estimatedDeliveryMax}
                  onChange={(e) => setEstimatedDeliveryMax(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Minimum Order Amount ($ USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={minimumOrderAmount}
                onChange={(e) => setMinimumOrderAmount(e.target.value)}
                placeholder="0.00"
                className="w-full sm:w-1/2 text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500 font-medium"
              />
            </div>
          </div>

          {/* Section: Cuisines / Categories */}
          {globalCategories.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-800">
              <label className="block text-xs font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                3. Associated Food Categories
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {globalCategories.map((c) => {
                  const isChecked = selectedCategoryIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
                          : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedCategoryIds(
                              selectedCategoryIds.filter((id) => id !== c.id)
                            );
                          } else {
                            setSelectedCategoryIds([...selectedCategoryIds, c.id]);
                          }
                        }}
                        className="rounded text-brand-500 focus:ring-brand-500"
                      />
                      <span>{c.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={createMutation.isPending}
              disabled={!name.trim() || !phone.trim() || !street.trim() || !city.trim()}
            >
              Create Restaurant
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
