import { cartRepository } from '../repositories/cart.repository';
import { menuRepository } from '../repositories/menu.repository';
import { restaurantRepository } from '../repositories/restaurant.repository';
import { pricingService } from './pricing.service';
import { AddToCartInput, UpdateCartItemInput } from '../validators/cart.validator';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors';
import { ErrorCode } from '../constants';
import { Coupon } from '@prisma/client';

export class CartService {
  async getCart(userId: string, couponCode?: string) {
    const cart = await cartRepository.getOrCreateCart(userId);
    const cartWithDetails = await cartRepository.findCartByUserId(userId);

    if (!cartWithDetails || cartWithDetails.items.length === 0) {
      return {
        id: cart.id,
        restaurant: null,
        items: [],
        pricing: {
          subtotal: 0,
          deliveryFee: 0,
          serviceFee: 0,
          discount: 0,
          tax: 0,
          total: 0,
        },
      };
    }

    const firstItem = cartWithDetails.items[0];
    const restaurant = firstItem.foodItem.restaurant;

    // Validate coupon if provided
    let coupon: Coupon | null = null;
    if (couponCode) {
      coupon = await cartRepository.findCouponByCode(couponCode);
      if (!coupon || !coupon.isActive) {
        throw new BadRequestError('Invalid or inactive coupon code.', ErrorCode.COUPON_INVALID);
      }
      const now = new Date();
      if (now < coupon.startDate || now > coupon.endDate) {
        throw new BadRequestError('Coupon code has expired.', ErrorCode.COUPON_EXPIRED);
      }
    }

    // Format items for pricing calculation
    const formattedItems = cartWithDetails.items.map((item) => {
      const basePrice = Number(item.foodItem.price);
      const addons = item.addons.map((a) => ({
        id: a.addon.id,
        name: a.addon.name,
        price: Number(a.addon.price),
      }));

      const addonsSum = addons.reduce((sum, a) => sum + a.price, 0);
      const lineSubtotal = Math.round((basePrice + addonsSum) * item.quantity * 100) / 100;

      return {
        id: item.id,
        foodItemId: item.foodItemId,
        name: item.foodItem.name,
        imageUrl: item.foodItem.imageUrl,
        basePrice,
        quantity: item.quantity,
        addons,
        lineSubtotal,
        specialInstructions: item.specialInstructions,
      };
    });

    const pricing = pricingService.calculateCart({
      items: formattedItems.map((fi) => ({
        basePrice: fi.basePrice,
        addons: fi.addons,
        quantity: fi.quantity,
      })),
      deliveryFeeBase: Number(restaurant.deliveryFeeBase),
      coupon,
    });

    return {
      id: cart.id,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        logoUrl: restaurant.logoUrl,
        deliveryFeeBase: Number(restaurant.deliveryFeeBase),
        estimatedDeliveryMin: restaurant.estimatedDeliveryMin,
        estimatedDeliveryMax: restaurant.estimatedDeliveryMax,
      },
      items: formattedItems,
      pricing,
    };
  }

  async addItem(userId: string, input: AddToCartInput, couponCode?: string) {
    const foodItem = await menuRepository.findFoodItemById(input.foodItemId);
    if (!foodItem) {
      throw new NotFoundError('Food item not found.', ErrorCode.FOOD_ITEM_NOT_FOUND);
    }

    if (!foodItem.isAvailable) {
      throw new BadRequestError('This food item is currently sold out.', ErrorCode.FOOD_ITEM_UNAVAILABLE);
    }

    const cart = await cartRepository.getOrCreateCart(userId);

    // Multi-restaurant cart check
    if (cart.restaurantId && cart.restaurantId !== foodItem.restaurantId) {
      if (!input.clearExistingIfDifferentRestaurant) {
        const existingRestaurant = await restaurantRepository.findById(cart.restaurantId);
        throw new ConflictError(
          `Your cart contains items from "${existingRestaurant?.name || 'another restaurant'}". Would you like to clear your cart and start a new order?`,
          ErrorCode.MULTI_RESTAURANT_CART
        );
      } else {
        // Clear cart for new restaurant
        await cartRepository.clearCart(cart.id);
      }
    }

    // Associate cart with restaurant if not set
    await cartRepository.setRestaurantId(cart.id, foodItem.restaurantId);

    // Add item
    await cartRepository.addItem(
      cart.id,
      foodItem.id,
      input.quantity,
      input.addonIds,
      input.specialInstructions
    );

    return this.getCart(userId, couponCode);
  }

  async updateItem(userId: string, cartItemId: string, input: UpdateCartItemInput, couponCode?: string) {
    const cart = await cartRepository.findCartByUserId(userId);
    if (!cart) {
      throw new NotFoundError('Cart not found.', ErrorCode.NOT_FOUND);
    }

    const itemBelongsToUser = cart.items.some((i) => i.id === cartItemId);
    if (!itemBelongsToUser) {
      throw new NotFoundError('Cart item not found in your basket.', ErrorCode.NOT_FOUND);
    }

    await cartRepository.updateItem(cartItemId, input.quantity, input.specialInstructions);

    // If all items removed, reset restaurantId
    const updatedCart = await cartRepository.findCartByUserId(userId);
    if (updatedCart && updatedCart.items.length === 0) {
      await cartRepository.setRestaurantId(cart.id, null);
    }

    return this.getCart(userId, couponCode);
  }

  async removeItem(userId: string, cartItemId: string, couponCode?: string) {
    return this.updateItem(userId, cartItemId, { quantity: 0 }, couponCode);
  }

  async clearCart(userId: string) {
    const cart = await cartRepository.getOrCreateCart(userId);
    await cartRepository.clearCart(cart.id);
    return this.getCart(userId);
  }

  async applyCoupon(userId: string, code: string) {
    const coupon = await cartRepository.findCouponByCode(code);
    if (!coupon || !coupon.isActive) {
      throw new BadRequestError('Invalid or inactive coupon code.', ErrorCode.COUPON_INVALID);
    }
    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
      throw new BadRequestError('Coupon code has expired.', ErrorCode.COUPON_EXPIRED);
    }

    return this.getCart(userId, coupon.code);
  }
}

export const cartService = new CartService();
