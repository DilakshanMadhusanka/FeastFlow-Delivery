import { prisma } from '../config/database';

export class CartRepository {
  async getOrCreateCart(userId: string) {
    return prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: {
        items: {
          include: {
            foodItem: true,
            addons: { include: { addon: true } },
          },
        },
      },
    });
  }

  async findCartByUserId(userId: string) {
    return prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            foodItem: {
              include: {
                restaurant: true,
              },
            },
            addons: {
              include: {
                addon: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async addItem(
    cartId: string,
    foodItemId: string,
    quantity: number,
    addonIds: string[],
    specialInstructions?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const cartItem = await tx.cartItem.create({
        data: {
          cartId,
          foodItemId,
          quantity,
          specialInstructions,
        },
      });

      if (addonIds && addonIds.length > 0) {
        await tx.cartItemAddon.createMany({
          data: addonIds.map((addonId) => ({
            cartItemId: cartItem.id,
            addonId,
          })),
        });
      }

      return cartItem;
    });
  }

  async updateItem(cartItemId: string, quantity: number, specialInstructions?: string) {
    if (quantity <= 0) {
      return this.removeItem(cartItemId);
    }

    return prisma.cartItem.update({
      where: { id: cartItemId },
      data: {
        quantity,
        ...(specialInstructions !== undefined ? { specialInstructions } : {}),
      },
    });
  }

  async removeItem(cartItemId: string) {
    return prisma.cartItem.delete({
      where: { id: cartItemId },
    });
  }

  async clearCart(cartId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { cartId } });
      await tx.cart.update({
        where: { id: cartId },
        data: { restaurantId: null },
      });
    });
  }

  async setRestaurantId(cartId: string, restaurantId: string | null) {
    return prisma.cart.update({
      where: { id: cartId },
      data: { restaurantId },
    });
  }

  async findCouponByCode(code: string) {
    return prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });
  }
}

export const cartRepository = new CartRepository();
