import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  ChefHat,
  ShoppingBag,
  BarChart3,
  Settings,
  LogOut,
  Store,
  ChevronDown,
  Flame,
  Tag,
  DollarSign,
  Star,
  Radio,
  MessageSquare,
  Users,
  UserPlus,
  Sparkles,
  Crown,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '@food-delivery/shared';

export const Sidebar: React.FC = () => {
  const { user, restaurant, restaurants, setRestaurant, logout } = useAuthStore();
  const isAdmin = Boolean(
    user?.roles?.includes(UserRole.ADMIN) || user?.roles?.includes('ADMIN' as any)
  );
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      to: '/orders',
      icon: ShoppingBag,
      label: 'Live Orders Board',
    },
    {
      to: '/kds',
      icon: Flame,
      label: 'Kitchen Display (KDS)',
    },
    {
      to: '/dispatch',
      icon: Radio,
      label: 'Fleet GPS Dispatch',
    },
    {
      to: '/messages',
      icon: MessageSquare,
      label: 'Live Chat Center',
    },
    {
      to: '/menu',
      icon: ChefHat,
      label: 'Menu Manager',
    },
    {
      to: '/marketing',
      icon: Sparkles,
      label: 'Flash Deals Engine',
    },
    {
      to: '/coupons',
      icon: Tag,
      label: 'Promos & Coupons',
    },
    {
      to: '/customers',
      icon: Crown,
      label: 'Customer CRM & VIPs',
    },
    {
      to: '/users',
      icon: UserPlus,
      label: 'Mobile App Users',
    },
    {
      to: '/reviews',
      icon: Star,
      label: 'Customer Reviews',
    },
    {
      to: '/finance',
      icon: DollarSign,
      label: 'Finance & Ledger',
    },
    {
      to: '/staff',
      icon: Users,
      label: 'Team & Staff (PIN)',
    },
    {
      to: '/analytics',
      icon: BarChart3,
      label: 'Daily Stats & KPIs',
    },
    {
      to: '/restaurants',
      icon: Store,
      label: 'Restaurants',
    },
    {
      to: '/settings',
      icon: Settings,
      label: 'Store Settings',
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen fixed left-0 top-0 z-30">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-gray-100 gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
          <UtensilsCrossed className="w-5 h-5" />
        </div>
        <div>
          <span className="font-extrabold text-lg tracking-tight text-gray-900 block leading-tight">
            Feast<span className="text-brand-500">Flow</span>
          </span>
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
            Merchant Portal
          </span>
        </div>
      </div>

      {/* Restaurant Switcher */}
      <div className="p-4 border-b border-gray-100">
        <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-brand-500 shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">
                {isAdmin
                  ? restaurant?.id === 'all'
                    ? 'All Restaurants'
                    : restaurant?.name || 'All Restaurants'
                  : restaurant?.name || 'No Restaurant Selected'}
              </p>
              <p className="text-[11px] text-gray-500 truncate">
                {isAdmin
                  ? 'System Administrator'
                  : restaurant?.city
                  ? `${restaurant.city} Branch`
                  : 'Kitchen Terminal'}
              </p>
            </div>
          </div>

          {(restaurants.length > 1 || isAdmin) && (
            <div className="mt-2.5 pt-2 border-t border-gray-200/60">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Switch Restaurant / Branch
              </label>
              <select
                value={restaurant?.id || (isAdmin ? 'all' : '')}
                onChange={(e) => {
                  if (e.target.value === 'all') {
                    setRestaurant({
                      id: 'all',
                      name: 'All Restaurants',
                      city: 'Platform Wide',
                    } as any);
                    return;
                  }
                  const found = restaurants.find((r) => r.id === e.target.value);
                  if (found) setRestaurant(found);
                }}
                className="w-full text-xs font-semibold bg-white border border-gray-200 rounded-lg p-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-sm cursor-pointer"
              >
                {isAdmin && <option value="all">🌐 All Restaurants (Platform)</option>}
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.city})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-50 text-brand-600 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer & Logout */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'ME'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">{user?.name || 'Manager'}</p>
              <p className="text-[11px] text-gray-500 truncate">{user?.email || 'owner@restaurant.com'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
