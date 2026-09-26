import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, Clock, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { restaurantService } from '../../services/restaurant.service';
import { Button } from '../../components/ui/Button';
import { Navbar } from '../../components/layout/Navbar';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const RestaurantSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { restaurant, setRestaurant } = useAuthStore();

  const [name, setName] = useState(restaurant?.name || '');
  const [phone, setPhone] = useState(restaurant?.phone || '');
  const [street, setStreet] = useState(restaurant?.street || '');
  const [city, setCity] = useState(restaurant?.city || '');
  const [deliveryFee, setDeliveryFee] = useState(String(restaurant?.deliveryFeeBase || '2.50'));
  const [estMin, setEstMin] = useState(String(restaurant?.estimatedDeliveryMin || '25'));
  const [estMax, setEstMax] = useState(String(restaurant?.estimatedDeliveryMax || '45'));
  const [isActive, setIsActive] = useState(restaurant?.isActive ?? true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Operating hours state (7 days)
  const initialHours = DAYS.map((_, dayOfWeek) => {
    const existing = (restaurant?.operatingHours || []).find((h) => h.dayOfWeek === dayOfWeek);
    return {
      dayOfWeek,
      openTime: existing?.openTime || '09:00',
      closeTime: existing?.closeTime || '22:00',
      isClosed: existing?.isClosed ?? false,
    };
  });

  const [hours, setHours] = useState(initialHours);

  React.useEffect(() => {
    if (restaurant) {
      setName(restaurant.name || '');
      setPhone(restaurant.phone || '');
      setStreet(restaurant.street || '');
      setCity(restaurant.city || '');
      setDeliveryFee(String(restaurant.deliveryFeeBase || '2.50'));
      setEstMin(String(restaurant.estimatedDeliveryMin || '25'));
      setEstMax(String(restaurant.estimatedDeliveryMax || '45'));
      setIsActive(restaurant.isActive ?? true);
      if (restaurant.operatingHours && restaurant.operatingHours.length > 0) {
        setHours(
          DAYS.map((_, dayOfWeek) => {
            const existing = restaurant.operatingHours?.find((h) => h.dayOfWeek === dayOfWeek);
            return {
              dayOfWeek,
              openTime: existing?.openTime || '09:00',
              closeTime: existing?.closeTime || '22:00',
              isClosed: existing?.isClosed ?? false,
            };
          })
        );
      }
    }
  }, [restaurant]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!restaurant) return;
      const updated = await restaurantService.updateRestaurant(restaurant.id, {
        name,
        phone,
        street,
        city,
        deliveryFeeBase: parseFloat(deliveryFee),
        estimatedDeliveryMin: parseInt(estMin, 10),
        estimatedDeliveryMax: parseInt(estMax, 10),
        isActive,
      });

      await restaurantService.updateHours(restaurant.id, hours);
      return updated;
    },
    onSuccess: (updated) => {
      if (updated) {
        setRestaurant(updated);
      }
      queryClient.invalidateQueries({ queryKey: ['myRestaurants'] });
      setSuccessMessage('Store settings & operating schedule saved successfully! 🎉');
      setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  const handleHourChange = (
    dayOfWeek: number,
    field: 'openTime' | 'closeTime' | 'isClosed',
    value: any
  ) => {
    setHours((prev) =>
      prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h))
    );
  };

  if (!restaurant) {
    return <div className="p-8 text-center text-gray-500 dark:text-slate-400">No restaurant selected</div>;
  }

  return (
    <div className="space-y-6">
      <Navbar title="Store Profile & Kitchen Configuration" />

      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: General Store Profile */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-slate-800">
              <Store className="w-5 h-5 text-brand-500" />
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">Restaurant Information</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Restaurant Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Base Delivery Fee ($ USD)
                </label>
                <input
                  type="number"
                  step="0.10"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Est. Delivery Time Window (Mins)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={estMin}
                    onChange={(e) => setEstMin(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium"
                    placeholder="Min"
                  />
                  <span className="text-gray-400 dark:text-slate-500 font-bold">-</span>
                  <input
                    type="number"
                    value={estMax}
                    onChange={(e) => setEstMax(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium"
                    placeholder="Max"
                  />
                </div>
              </div>
            </div>

            {/* Store Open/Closed Toggle */}
            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-extrabold text-xs text-gray-900 dark:text-white">Accepting Orders Now</p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  Instantly pause incoming orders in case of kitchen rushes or emergencies.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Operating Hours Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-slate-800">
              <Clock className="w-5 h-5 text-brand-500" />
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">Weekly Operating Hours</h3>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {DAYS.map((day, idx) => {
                const dayHour = hours.find((h) => h.dayOfWeek === idx) || {
                  dayOfWeek: idx,
                  openTime: '09:00',
                  closeTime: '22:00',
                  isClosed: false,
                };

                return (
                  <div key={day} className="py-3 flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-800 dark:text-slate-200 w-28">{day}</span>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-gray-600 dark:text-slate-400 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dayHour.isClosed}
                          onChange={(e) => handleHourChange(idx, 'isClosed', e.target.checked)}
                          className="rounded border-gray-300 dark:border-slate-700 text-brand-500 focus:ring-brand-500"
                        />
                        <span>Closed</span>
                      </label>

                      {!dayHour.isClosed && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="time"
                            value={dayHour.openTime}
                            onChange={(e) => handleHourChange(idx, 'openTime', e.target.value)}
                            className="p-1.5 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg text-xs font-medium"
                          />
                          <span className="text-gray-400 dark:text-slate-500">to</span>
                          <input
                            type="time"
                            value={dayHour.closeTime}
                            onChange={(e) => handleHourChange(idx, 'closeTime', e.target.value)}
                            className="p-1.5 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-lg text-xs font-medium"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Save and Status Overview */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">Publish Changes</h4>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Saving updates will immediately synchronize your operating schedule with the Customer Mobile App.
            </p>

            <Button
              className="w-full"
              size="lg"
              variant="primary"
              isLoading={updateProfileMutation.isPending}
              onClick={() => updateProfileMutation.mutate()}
            >
              <Save className="w-4 h-4 mr-2" /> Save Store Settings
            </Button>
          </div>

          <div className="bg-brand-50/50 dark:bg-slate-800/50 rounded-2xl p-6 border border-brand-100 dark:border-slate-800 space-y-2">
            <h4 className="font-bold text-xs text-brand-900 dark:text-brand-300 uppercase tracking-wider">
              Store Moderation Status
            </h4>
            <div className="flex items-center gap-2 text-xs font-bold text-brand-700 dark:text-brand-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Verified & Approved Platform Partner</span>
            </div>
            <p className="text-[11px] text-brand-800/80 dark:text-slate-400 leading-relaxed pt-1">
              Your restaurant is approved by FeastFlow platform administrators. You are eligible to
              receive customer orders and request on-demand delivery couriers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
