import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Utensils,
  Clock,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  FolderPlus,
  Store,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { menuService } from '../../services/menu.service';
import { FoodCategory, FoodItem } from '../../types';
import { UserRole } from '@food-delivery/shared';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Navbar } from '../../components/layout/Navbar';

export const MenuManagerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { restaurant, restaurants, setRestaurant, user } = useAuthStore();
  const isAdmin = Boolean(
    user?.roles?.includes(UserRole.ADMIN) || user?.roles?.includes('ADMIN' as any)
  );

  const [selectedBranchId, setSelectedBranchId] = useState<string>(() =>
    isAdmin ? 'ALL' : restaurant?.id || 'ALL'
  );

  useEffect(() => {
    if (isAdmin) {
      setSelectedBranchId('ALL');
    } else if (restaurant?.id && selectedBranchId === 'ALL') {
      setSelectedBranchId(restaurant.id);
    }
  }, [isAdmin, restaurant?.id]);

  const isViewingAll = selectedBranchId === 'ALL';
  const queryRestaurantId = isViewingAll ? 'all' : selectedBranchId;

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // New item form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [prepTime, setPrepTime] = useState('15');
  const [newCatName, setNewCatName] = useState('');
  const [targetRestaurantId, setTargetRestaurantId] = useState('');

  // Fetch restaurant menu categories and items (pushed all-restaurants if admin)
  const {
    data: rawCategories = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['restaurantMenu', queryRestaurantId],
    queryFn: () => menuService.getRestaurantMenu(queryRestaurantId),
    enabled: Boolean(isViewingAll || selectedBranchId || restaurant?.id),
    staleTime: 30 * 1000,
  });

  const categories: FoodCategory[] = Array.isArray(rawCategories) ? rawCategories : [];

  // Fetch all categories for the Add Food Item dropdown
  const { data: globalCategories = [] } = useQuery({
    queryKey: ['globalCategories'],
    queryFn: () => menuService.getCategories(),
    staleTime: 5 * 60 * 1000,
  });

  // Combined categories for the modal dropdown
  const availableCategoriesMap = new Map<string, FoodCategory>();
  (Array.isArray(globalCategories) ? globalCategories : []).forEach((c) => availableCategoriesMap.set(c.id, c));
  categories.forEach((c) => availableCategoriesMap.set(c.id, c));
  const availableCategories = Array.from(availableCategoriesMap.values());

  // Toggle in-stock availability mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      menuService.toggleAvailability(id, isAvailable),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantMenu'] });
      queryClient.refetchQueries({ queryKey: ['restaurantMenu'] });
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: ({ id, duration }: { id: string; duration: '2_HOURS' | 'REST_OF_DAY' | 'INDEFINITE' }) =>
      menuService.snoozeFoodItem(id, duration),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantMenu'] });
    },
  });

  const unsnoozeMutation = useMutation({
    mutationFn: (id: string) => menuService.unsnoozeFoodItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantMenu'] });
    },
  });

  // Create new food item mutation
  const createItemMutation = useMutation({
    mutationFn: () => {
      const activeRestId = isViewingAll
        ? targetRestaurantId
        : selectedBranchId !== 'ALL'
        ? selectedBranchId
        : restaurant?.id;
      if (!activeRestId) {
        throw new Error('Please select a target restaurant');
      }
      return menuService.createFoodItem({
        restaurantId: activeRestId,
        categoryId,
        name: name.trim(),
        description: description.trim() || undefined,
        price: parseFloat(price),
        preparationTimeMin: parseInt(prepTime, 10) || 15,
        isAvailable: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantMenu'] });
      queryClient.refetchQueries({ queryKey: ['restaurantMenu'] });
      setShowAddModal(false);
      setName('');
      setDescription('');
      setPrice('');
      setCategoryId('');
      setPrepTime('15');
      setTargetRestaurantId('');
    },
  });

  // Create new category mutation
  const createCatMutation = useMutation({
    mutationFn: () => {
      const activeRestId = isViewingAll
        ? undefined
        : selectedBranchId !== 'ALL'
        ? selectedBranchId
        : restaurant?.id;
      return menuService.createCategory({
        name: newCatName.trim(),
        restaurantId: activeRestId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantMenu'] });
      queryClient.refetchQueries({ queryKey: ['restaurantMenu'] });
      queryClient.invalidateQueries({ queryKey: ['globalCategories'] });
      setShowCategoryModal(false);
      setNewCatName('');
    },
  });

  // Delete food item mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => menuService.deleteFoodItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantMenu'] });
      queryClient.refetchQueries({ queryKey: ['restaurantMenu'] });
    },
  });

  // Collect all items across categories
  const allItems: FoodItem[] = [];
  categories.forEach((cat) => {
    (cat.foodItems || []).forEach((item) => {
      allItems.push({ ...item, category: { id: cat.id, name: cat.name } });
    });
  });

  // Filter items
  const filteredItems = allItems.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.categoryId === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const currentBranchName = isViewingAll
    ? 'All Restaurants (Platform Wide)'
    : restaurants.find((r) => r.id === selectedBranchId)?.name || restaurant?.name || 'Kitchen';

  return (
    <div className="space-y-6">
      <Navbar
        title={`${currentBranchName} • Menu & Inventory Management`}
        onRefresh={refetch}
        isRefreshing={isFetching}
      />

      {/* Quick Branch Filter Bar */}
      {(isAdmin || restaurants.length > 1) && (
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
            <Store className="w-4 h-4 text-brand-500" />
            <span>{isAdmin ? 'View Scope:' : 'Active Branch:'}</span>
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
                <span>🌐 All Restaurants</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    isViewingAll ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                  }`}
                >
                  All ({allItems.length})
                </span>
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

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu items..."
            className="w-full pl-10 pr-4 py-2 text-xs font-medium rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCategoryModal(true)}
            className="flex-1 sm:flex-none"
          >
            <FolderPlus className="w-4 h-4 mr-1.5" /> Add Category
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Food Item
          </Button>
        </div>
      </div>

      {/* Categories Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            selectedCategory === 'ALL'
              ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
              : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
          }`}
        >
          All Items ({allItems.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedCategory === cat.id
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
            }`}
          >
            {cat.name} ({(cat.foodItems || []).length})
          </button>
        ))}
      </div>

      {/* Food Items Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/75 dark:bg-slate-800/80 border-b border-gray-100 dark:border-slate-800 text-gray-400 dark:text-slate-400 font-extrabold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">
                  {isAdmin || isViewingAll ? 'Item Name & Restaurant' : 'Item Name'}
                </th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Prep Time</th>
                <th className="py-3.5 px-4">In Stock Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 font-semibold">
                    No food items found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-10 h-10 rounded-xl object-cover bg-gray-100 dark:bg-slate-800 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-400 flex items-center justify-center shrink-0">
                            <Utensils className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-extrabold text-sm text-gray-900 dark:text-white">{item.name}</p>
                            {item.restaurant && (
                              <span className="text-[10px] font-bold bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200/80 dark:border-orange-800/50 px-2 py-0.5 rounded-md shrink-0">
                                {item.restaurant.name}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-500 dark:text-slate-400 line-clamp-1 text-[11px] max-w-xs mt-0.5">
                            {item.description || 'No description provided'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-bold text-gray-700 dark:text-slate-200">
                      {item.category?.name || 'Unassigned'}
                    </td>

                    <td className="py-4 px-4 font-extrabold text-sm text-gray-900 dark:text-white">
                      ${Number(item.price).toFixed(2)}
                    </td>

                    <td className="py-4 px-4 font-semibold text-gray-600 dark:text-slate-300">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {item.preparationTimeMin} mins
                      </span>
                    </td>


                    {/* 1-Click Availability & Snooze Controls */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() =>
                            toggleMutation.mutate({
                              id: item.id,
                              isAvailable: !item.isAvailable,
                            })
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs transition-colors ${
                            item.isAvailable
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {item.isAvailable ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>In Stock</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Sold Out</span>
                            </>
                          )}
                        </button>

                        {item.isAvailable ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                snoozeMutation.mutate({ id: item.id, duration: '2_HOURS' })
                              }
                              title="Snooze for 2 Hours"
                              className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[10px] font-bold transition-colors"
                            >
                              2h
                            </button>
                            <button
                              onClick={() =>
                                snoozeMutation.mutate({ id: item.id, duration: 'REST_OF_DAY' })
                              }
                              title="Snooze for Rest of Day"
                              className="px-2 py-0.5 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 rounded text-[10px] font-bold transition-colors"
                            >
                              Day
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => unsnoozeMutation.mutate(item.id)}
                            title="Restore to Available"
                            className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold transition-colors"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete "${item.name}" from your menu?`)) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Food Item Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Menu Item"
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createItemMutation.mutate();
          }}
          className="space-y-4"
        >
          {isViewingAll && (
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Target Restaurant
              </label>
              <select
                value={targetRestaurantId}
                onChange={(e) => setTargetRestaurantId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:ring-1 focus:ring-brand-500 font-medium"
                required
              >
                <option value="">Select a restaurant</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.city})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Food Item Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Truffle Mushroom Burger"
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:ring-1 focus:ring-brand-500 font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:ring-1 focus:ring-brand-500 font-medium"
              required
            >
              <option value="">Select a category</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Price ($ USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="14.50"
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:ring-1 focus:ring-brand-500 font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Prep Time (Mins)
              </label>
              <input
                type="number"
                min="1"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:ring-1 focus:ring-brand-500 font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Fresh brioche bun, swiss cheese, caramelized onions..."
              rows={2}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:ring-1 focus:ring-brand-500 font-medium"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="secondary" size="sm" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={createItemMutation.isPending}
              disabled={!name.trim() || !price || !categoryId || (isViewingAll && !targetRestaurantId)}
            >
              Save Food Item
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Add Menu Category"
        maxWidth="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createCatMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Category Name
            </label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Appetizers, Signature Pizzas"
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:ring-1 focus:ring-brand-500 font-medium"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="secondary" size="sm" onClick={() => setShowCategoryModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={createCatMutation.isPending}
              disabled={!newCatName.trim()}
            >
              Create Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
