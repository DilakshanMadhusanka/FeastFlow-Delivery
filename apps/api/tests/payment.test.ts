import { describe, it, expect } from 'vitest';
import { paymentService } from '../src/services/payment.service';
import { createAddressSchema } from '../src/validators/address.validator';
import { createPaymentIntentSchema } from '../src/validators/payment.validator';
import { AddressTypeEnum, PaymentMethodEnum } from '@prisma/client';
import { BadRequestError } from '../src/utils/errors';

describe('Address Validation', () => {
  it('should accept valid address payload', () => {
    const valid = {
      title: 'Home Apartment',
      type: AddressTypeEnum.HOME,
      street: '123 Broadway Ave',
      apartment: 'Suite 4B',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      latitude: 40.7128,
      longitude: -74.006,
      deliveryInstructions: 'Ring buzzer #42',
      isDefault: true,
    };
    const result = createAddressSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject address with invalid GPS coordinates or missing street', () => {
    const invalidCoords = {
      title: 'Home',
      street: '123 Main St',
      city: 'New York',
      latitude: 195.0, // Latitude cannot exceed 90!
      longitude: -74.0,
    };
    expect(createAddressSchema.safeParse(invalidCoords).success).toBe(false);

    const missingStreet = {
      title: 'Home',
      city: 'New York',
      latitude: 40.0,
      longitude: -74.0,
    };
    expect(createAddressSchema.safeParse(missingStreet).success).toBe(false);
  });
});

describe('Payment Engine & Security', () => {
  it('should validate payment intent schemas', () => {
    const valid = {
      amount: 25.5,
      currency: 'usd',
      paymentMethod: PaymentMethodEnum.CARD,
    };
    expect(createPaymentIntentSchema.safeParse(valid).success).toBe(true);

    const negative = {
      amount: -10,
    };
    expect(createPaymentIntentSchema.safeParse(negative).success).toBe(false);
  });

  it('should generate Cash on Delivery intent without client secret', async () => {
    const result = await paymentService.createPaymentIntent({
      userId: 'usr-buyer-1',
      amount: 22.0,
      paymentMethod: PaymentMethodEnum.COD,
    });

    expect(result.transactionId.startsWith('cod_')).toBe(true);
    expect(result.clientSecret).toBeNull();
    expect(result.amount).toBe(22.0);
    expect(result.paymentMethod).toBe(PaymentMethodEnum.COD);
  });

  it('should generate Credit Card intent with secure client secret', async () => {
    const result = await paymentService.createPaymentIntent({
      userId: 'usr-buyer-2',
      amount: 45.8,
      paymentMethod: PaymentMethodEnum.CARD,
    });

    expect(result.transactionId.startsWith('pi_')).toBe(true);
    expect(result.clientSecret).not.toBeNull();
    expect(result.clientSecret?.includes('_secret_')).toBe(true);
    expect(result.amount).toBe(45.8);
    expect(result.paymentMethod).toBe(PaymentMethodEnum.CARD);
  });

  it('should reject payment creation with non-positive amounts', async () => {
    await expect(
      paymentService.createPaymentIntent({
        userId: 'usr-buyer-3',
        amount: 0,
        paymentMethod: PaymentMethodEnum.CARD,
      })
    ).rejects.toThrow(BadRequestError);
  });

  it('should process webhook events safely', async () => {
    const result = await paymentService.handleWebhook({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_non_existent_mock_id',
        },
      },
    });

    expect(result.received).toBe(true);
  });
});
