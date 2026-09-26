import 'dotenv/config';
import path from 'path';
import dotenv from 'dotenv';

// Load from both api directory and root workspace
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import {
  PrismaClient,
  UserRoleEnum,
  AddressTypeEnum,
  OptionSelectionTypeEnum,
  VehicleTypeEnum,
  OrderStatusEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
  CouponDiscountTypeEnum,
  AssignmentStatusEnum,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set before running the Prisma seed.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main() {
  console.log('🌱 Starting database seeding for FeastFlow...');

  // Clean existing data in reverse order of foreign keys
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.couponUsage.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.driverLocation.deleteMany();
  await prisma.deliveryAssignment.deleteMany();
  await prisma.deliveryDriver.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItemAddon.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItemAddon.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.foodAddon.deleteMany();
  await prisma.foodItemOption.deleteMany();
  await prisma.foodItem.deleteMany();
  await prisma.restaurantCategory.deleteMany();
  await prisma.foodCategory.deleteMany();
  await prisma.restaurantHour.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.address.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing records.');

  // 1. Create Roles
  const roles = await Promise.all([
    prisma.role.create({ data: { name: UserRoleEnum.ADMIN, description: 'Platform Administrator' } }),
    prisma.role.create({ data: { name: UserRoleEnum.RESTAURANT_OWNER, description: 'Restaurant Merchant' } }),
    prisma.role.create({ data: { name: UserRoleEnum.DELIVERY_DRIVER, description: 'Delivery Courier' } }),
    prisma.role.create({ data: { name: UserRoleEnum.CUSTOMER, description: 'End Customer' } }),
  ]);

  const roleMap = new Map(roles.map((r) => [r.name, r.id]));
  console.log('✅ Created 4 System Roles');

  // Helper for password hash
  const defaultPasswordHash = await bcrypt.hash('Password@123', 10);

  // 2. Create Users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@feastflow.com',
      passwordHash: defaultPasswordHash,
      name: 'System Admin',
      phone: '+15550000001',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      isEmailVerified: true,
      userRoles: { create: [{ roleId: roleMap.get(UserRoleEnum.ADMIN)! }] },
    },
  });

  const ownerBistro = await prisma.user.create({
    data: {
      email: 'bistro.owner@feastflow.com',
      passwordHash: defaultPasswordHash,
      name: 'Marco Rossi',
      phone: '+15550000002',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      isEmailVerified: true,
      userRoles: { create: [{ roleId: roleMap.get(UserRoleEnum.RESTAURANT_OWNER)! }] },
    },
  });

  const ownerNapoli = await prisma.user.create({
    data: {
      email: 'napoli.owner@feastflow.com',
      passwordHash: defaultPasswordHash,
      name: 'Luigi Moretti',
      phone: '+15550000003',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
      isEmailVerified: true,
      userRoles: { create: [{ roleId: roleMap.get(UserRoleEnum.RESTAURANT_OWNER)! }] },
    },
  });

  const driverMike = await prisma.user.create({
    data: {
      email: 'driver.mike@feastflow.com',
      passwordHash: defaultPasswordHash,
      name: 'Mike Johnson',
      phone: '+15550000004',
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
      isEmailVerified: true,
      userRoles: { create: [{ roleId: roleMap.get(UserRoleEnum.DELIVERY_DRIVER)! }] },
    },
  });

  const driverSarah = await prisma.user.create({
    data: {
      email: 'driver.sarah@feastflow.com',
      passwordHash: defaultPasswordHash,
      name: 'Sarah Connor',
      phone: '+15550000005',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
      isEmailVerified: true,
      userRoles: { create: [{ roleId: roleMap.get(UserRoleEnum.DELIVERY_DRIVER)! }] },
    },
  });

  const customerJohn = await prisma.user.create({
    data: {
      email: 'john.doe@gmail.com',
      passwordHash: defaultPasswordHash,
      name: 'John Doe',
      phone: '+15550000006',
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
      isEmailVerified: true,
      userRoles: { create: [{ roleId: roleMap.get(UserRoleEnum.CUSTOMER)! }] },
    },
  });

  console.log('✅ Created Demo Users (Admin, Owners, Drivers, Customers)');

  // 3. Create Addresses
  const addressJohnHome = await prisma.address.create({
    data: {
      userId: customerJohn.id,
      title: 'Home',
      type: AddressTypeEnum.HOME,
      street: '350 5th Ave',
      apartment: 'Apt 14B',
      city: 'New York',
      state: 'NY',
      postalCode: '10118',
      latitude: 40.7484,
      longitude: -73.9857,
      isDefault: true,
    },
  });

  await prisma.address.create({
    data: {
      userId: customerJohn.id,
      title: 'Office',
      type: AddressTypeEnum.WORK,
      street: '1 World Trade Center',
      apartment: 'Suite 4200',
      city: 'New York',
      state: 'NY',
      postalCode: '10007',
      latitude: 40.7127,
      longitude: -74.0134,
      isDefault: false,
    },
  });

  console.log('✅ Created Customer Addresses');

  // 4. Create Driver Profiles
  const driverProfileMike = await prisma.deliveryDriver.create({
    data: {
      userId: driverMike.id,
      vehicleType: VehicleTypeEnum.MOTORCYCLE,
      licensePlate: 'NY-DRV-789',
      isOnline: true,
      isVerified: true,
      currentLatitude: 40.749,
      currentLongitude: -73.987,
      ratingAverage: 4.95,
      totalDeliveries: 342,
    },
  });

  await prisma.deliveryDriver.create({
    data: {
      userId: driverSarah.id,
      vehicleType: VehicleTypeEnum.SCOOTER,
      licensePlate: 'NY-ECO-102',
      isOnline: true,
      isVerified: true,
      currentLatitude: 40.735,
      currentLongitude: -73.991,
      ratingAverage: 4.88,
      totalDeliveries: 189,
    },
  });

  console.log('✅ Created Active Driver Profiles');

  // 5. Create Global Categories
  const catBurgers = await prisma.foodCategory.create({
    data: {
      name: 'Burgers & Fries',
      slug: 'burgers',
      iconUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=150&q=80',
      sortOrder: 1,
    },
  });

  const catPizza = await prisma.foodCategory.create({
    data: {
      name: 'Wood-Fired Pizza',
      slug: 'pizza',
      iconUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=150&q=80',
      sortOrder: 2,
    },
  });

  const catAsian = await prisma.foodCategory.create({
    data: {
      name: 'Sushi & Ramen',
      slug: 'asian',
      iconUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=150&q=80',
      sortOrder: 3,
    },
  });

  const catDrinks = await prisma.foodCategory.create({
    data: {
      name: 'Beverages & Shakes',
      slug: 'drinks',
      iconUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=150&q=80',
      sortOrder: 4,
    },
  });

  console.log('✅ Created Food Categories');

  // 6. Create Restaurant 1: "The Burger Bistro NYC"
  const restaurantBistro = await prisma.restaurant.create({
    data: {
      ownerId: ownerBistro.id,
      name: 'The Burger Bistro NYC',
      slug: 'burger-bistro-nyc',
      description: 'Artisanal smash burgers, hand-cut fries, and thick shakes made from grass-fed beef.',
      phone: '+12125550190',
      email: 'info@burgerbistronyc.com',
      logoUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=300&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1200&q=80',
      street: '124 W 30th St',
      city: 'New York',
      latitude: 40.7481,
      longitude: -73.9902,
      deliveryRadiusKm: 8.5,
      minimumOrderAmount: 12.0,
      deliveryFeeBase: 2.99,
      estimatedDeliveryMin: 20,
      estimatedDeliveryMax: 35,
      isApproved: true,
      isActive: true,
      ratingAverage: 4.85,
      ratingCount: 420,
      categoryLinks: {
        create: [{ foodCategoryId: catBurgers.id }, { foodCategoryId: catDrinks.id }],
      },
      operatingHours: {
        create: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
          dayOfWeek: day,
          openTime: '10:00',
          closeTime: '23:00',
          isClosed: false,
        })),
      },
    },
  });

  // Food Items for Burger Bistro
  const itemDoubleSmash = await prisma.foodItem.create({
    data: {
      restaurantId: restaurantBistro.id,
      categoryId: catBurgers.id,
      name: 'Truffle Double Smash Burger',
      description: 'Two 100% Angus patties, black truffle aioli, melted aged cheddar, caramelized onions, brioche bun.',
      price: 14.99,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
      ingredients: ['Angus Beef', 'Truffle Aioli', 'Aged Cheddar', 'Caramelized Onions', 'Brioche Bun'],
      preparationTimeMin: 12,
      isAvailable: true,
      ratingAverage: 4.9,
      ratingCount: 310,
    },
  });

  // Options & Addons for Truffle Double Smash
  const optionDoneness = await prisma.foodItemOption.create({
    data: {
      foodItemId: itemDoubleSmash.id,
      name: 'Burger Doneness',
      type: OptionSelectionTypeEnum.SINGLE,
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
    },
  });

  await prisma.foodAddon.createMany({
    data: [
      { foodItemId: itemDoubleSmash.id, optionId: optionDoneness.id, name: 'Medium Well (Pink Center)', price: 0.0 },
      { foodItemId: itemDoubleSmash.id, optionId: optionDoneness.id, name: 'Well Done', price: 0.0 },
    ],
  });

  const optionAddons = await prisma.foodItemOption.create({
    data: {
      foodItemId: itemDoubleSmash.id,
      name: 'Extra Toppings & Add-ons',
      type: OptionSelectionTypeEnum.MULTIPLE,
      isRequired: false,
      minSelect: 0,
      maxSelect: 4,
    },
  });

  const addonCheese = await prisma.foodAddon.create({
    data: { foodItemId: itemDoubleSmash.id, optionId: optionAddons.id, name: 'Extra Melted Cheddar', price: 1.5 },
  });

  const addonBacon = await prisma.foodAddon.create({
    data: { foodItemId: itemDoubleSmash.id, optionId: optionAddons.id, name: 'Crispy Applewood Smoked Bacon', price: 2.25 },
  });

  const addonJalapeno = await prisma.foodAddon.create({
    data: { foodItemId: itemDoubleSmash.id, optionId: optionAddons.id, name: 'Pickled Jalapeños', price: 0.75 },
  });

  // Fries item
  await prisma.foodItem.create({
    data: {
      restaurantId: restaurantBistro.id,
      categoryId: catBurgers.id,
      name: 'Parmesan Herb Garlic Fries',
      description: 'Crispy russet fries tossed in garlic oil, freshly grated parmesan, rosemary, and thyme.',
      price: 5.99,
      imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=800&q=80',
      ingredients: ['Russet Potatoes', 'Garlic', 'Parmesan', 'Rosemary', 'Sea Salt'],
      preparationTimeMin: 8,
      isAvailable: true,
      ratingAverage: 4.8,
      ratingCount: 190,
    },
  });

  // Shake item
  await prisma.foodItem.create({
    data: {
      restaurantId: restaurantBistro.id,
      categoryId: catDrinks.id,
      name: 'Salted Caramel Pretzel Shake',
      description: 'Hand-spun Madagascar vanilla gelato with sea-salt caramel drizzle and crushed pretzels.',
      price: 6.5,
      imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
      ingredients: ['Vanilla Gelato', 'Salted Caramel', 'Pretzels', 'Whole Milk'],
      preparationTimeMin: 5,
      isAvailable: true,
      ratingAverage: 4.9,
      ratingCount: 145,
    },
  });

  // 7. Create Restaurant 2: "Bella Napoli Pizzeria"
  const restaurantNapoli = await prisma.restaurant.create({
    data: {
      ownerId: ownerNapoli.id,
      name: 'Bella Napoli Trattoria',
      slug: 'bella-napoli-trattoria',
      description: 'Traditional wood-fired Neapolitan pizza prepared in 900° ovens with San Marzano tomatoes.',
      phone: '+12125550245',
      email: 'contact@bellanapolinewyork.com',
      logoUrl: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=300&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
      street: '45 Prince St',
      city: 'New York',
      latitude: 40.7226,
      longitude: -73.9954,
      deliveryRadiusKm: 10.0,
      minimumOrderAmount: 15.0,
      deliveryFeeBase: 3.49,
      estimatedDeliveryMin: 25,
      estimatedDeliveryMax: 45,
      isApproved: true,
      isActive: true,
      ratingAverage: 4.92,
      ratingCount: 560,
      categoryLinks: {
        create: [{ foodCategoryId: catPizza.id }, { foodCategoryId: catDrinks.id }],
      },
      operatingHours: {
        create: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
          dayOfWeek: day,
          openTime: '11:30',
          closeTime: '23:30',
          isClosed: false,
        })),
      },
    },
  });

  await prisma.foodItem.create({
    data: {
      restaurantId: restaurantNapoli.id,
      categoryId: catPizza.id,
      name: 'Pizza Margherita D.O.P.',
      description: 'San Marzano D.O.P. tomatoes, fresh buffalo mozzarella, fragrant sweet basil, extra virgin olive oil.',
      price: 18.5,
      imageUrl: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=800&q=80',
      ingredients: ['San Marzano Tomatoes', 'Buffalo Mozzarella', 'Fresh Basil', 'EVOO'],
      preparationTimeMin: 15,
      isAvailable: true,
      ratingAverage: 4.95,
      ratingCount: 410,
    },
  });

  console.log('✅ Created Demo Restaurants, Menus, Options, and Addons');

  // 8. Create Coupons
  const couponWelcome = await prisma.coupon.create({
    data: {
      code: 'WELCOME20',
      description: '20% off your entire first feast',
      discountType: CouponDiscountTypeEnum.PERCENTAGE,
      discountValue: 20.0,
      minimumAmount: 15.0,
      maxDiscount: 10.0,
      usageLimit: 1000,
      perUserLimit: 1,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2028-12-31'),
      isActive: true,
    },
  });

  await prisma.coupon.create({
    data: {
      code: 'FEAST5',
      description: '$5.00 off orders over $25.00',
      discountType: CouponDiscountTypeEnum.FIXED,
      discountValue: 5.0,
      minimumAmount: 25.0,
      usageLimit: 500,
      perUserLimit: 2,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2028-12-31'),
      isActive: true,
    },
  });

  console.log('✅ Created Promotional Coupons');

  // 9. Create a Sample Completed Order with History & Review
  const sampleOrder = await prisma.order.create({
    data: {
      orderNumber: 'ORD-1001',
      customerId: customerJohn.id,
      restaurantId: restaurantBistro.id,
      deliveryAddressId: addressJohnHome.id,
      status: OrderStatusEnum.DELIVERED,
      subtotal: 17.24,
      deliveryFee: 2.99,
      serviceFee: 1.5,
      discountAmount: 3.45, // 20% discount from WELCOME20
      tipAmount: 3.0,
      totalAmount: 21.28,
      couponId: couponWelcome.id,
      specialInstructions: 'Please leave at the door and ring doorbell.',
      placedAt: new Date(Date.now() - 3600 * 1000 * 2),
      completedAt: new Date(Date.now() - 3600 * 1000),
      items: {
        create: [
          {
            foodItemId: itemDoubleSmash.id,
            nameSnapshot: 'Truffle Double Smash Burger',
            priceSnapshot: 14.99,
            quantity: 1,
            subtotal: 17.24,
            specialNotes: 'Extra hot please',
            addons: {
              create: [
                {
                  addonId: addonBacon.id,
                  nameSnapshot: 'Crispy Applewood Smoked Bacon',
                  priceSnapshot: 2.25,
                },
              ],
            },
          },
        ],
      },
      statusHistory: {
        create: [
          { status: OrderStatusEnum.PENDING, notes: 'Order placed by customer' },
          { status: OrderStatusEnum.RESTAURANT_ACCEPTED, notes: 'Order accepted by kitchen' },
          { status: OrderStatusEnum.PREPARING, notes: 'Patties on the grill' },
          { status: OrderStatusEnum.READY_FOR_PICKUP, notes: 'Food packaged and warm' },
          { status: OrderStatusEnum.DRIVER_ASSIGNED, notes: 'Courier Mike Johnson assigned' },
          { status: OrderStatusEnum.PICKED_UP, notes: 'Courier in transit' },
          { status: OrderStatusEnum.DELIVERED, notes: 'Delivered to customer front door' },
        ],
      },
      payment: {
        create: {
          userId: customerJohn.id,
          amount: 21.28,
          paymentMethod: PaymentMethodEnum.ONLINE,
          paymentStatus: PaymentStatusEnum.COMPLETED,
          transactionId: 'txn_demo_stripe_1001',
          paymentGateway: 'STRIPE',
        },
      },
      deliveryAssignment: {
        create: {
          driverId: driverProfileMike.id,
          status: AssignmentStatusEnum.DELIVERED,
          driverPayout: 6.5,
          deliveredAt: new Date(Date.now() - 3600 * 1000),
        },
      },
    },
  });

  // Record coupon usage
  await prisma.couponUsage.create({
    data: {
      couponId: couponWelcome.id,
      userId: customerJohn.id,
      orderId: sampleOrder.id,
    },
  });

  // Record 5-star review from customer
  await prisma.review.create({
    data: {
      userId: customerJohn.id,
      restaurantId: restaurantBistro.id,
      orderId: sampleOrder.id,
      foodItemId: itemDoubleSmash.id,
      rating: 5,
      comment: 'Best smash burger in NYC! The truffle aioli and crispy bacon were unbelievable. Fast delivery too!',
      reply: 'Thank you so much John! We take immense pride in our Angus beef and homemade aioli. See you soon!',
      repliedAt: new Date(),
    },
  });

  // Notification for John
  await prisma.notification.create({
    data: {
      userId: customerJohn.id,
      title: 'Order Delivered! 🎉',
      body: 'Your order #ORD-1001 from The Burger Bistro NYC has arrived. Enjoy your meal!',
      type: 'ORDER_UPDATE',
      data: { orderId: sampleOrder.id, orderNumber: 'ORD-1001' },
      isRead: true,
    },
  });

  console.log('✅ Seeded Sample Order, Lifecycle History, Payment, and Review');
  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
