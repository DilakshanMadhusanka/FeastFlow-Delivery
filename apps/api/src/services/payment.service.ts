import crypto from 'crypto';
import { prisma } from '../config/database';
import { PaymentMethodEnum, PaymentStatusEnum } from '@prisma/client';
import { env } from '../config/env';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { ErrorCode } from '../constants';

export class PaymentService {
  /**
   * Initializes a payment intent for credit card or cash on delivery.
   * Security Guarantee: Never accepts or stores raw card information in the database.
   */
  async createPaymentIntent(params: {
    userId: string;
    amount: number;
    currency?: string;
    paymentMethod: PaymentMethodEnum;
    orderId?: string;
  }) {
    if (params.amount <= 0) {
      throw new BadRequestError('Payment amount must be greater than zero.', ErrorCode.BAD_REQUEST);
    }

    const transactionId =
      params.paymentMethod === PaymentMethodEnum.COD
        ? `cod_${crypto.randomBytes(12).toString('hex')}`
        : `pi_${crypto.randomBytes(16).toString('hex')}`;

    const clientSecret =
      params.paymentMethod === PaymentMethodEnum.COD
        ? null
        : `${transactionId}_secret_${crypto.randomBytes(12).toString('hex')}`;

    // If orderId provided, record initial payment state
    if (params.orderId) {
      await prisma.payment.upsert({
        where: { orderId: params.orderId },
        update: {
          amount: params.amount,
          paymentMethod: params.paymentMethod,
          paymentStatus:
            params.paymentMethod === PaymentMethodEnum.COD
              ? PaymentStatusEnum.PENDING
              : PaymentStatusEnum.PENDING,
          transactionId,
          paymentGateway: params.paymentMethod === PaymentMethodEnum.COD ? 'CASH' : 'STRIPE',
        },
        create: {
          orderId: params.orderId,
          userId: params.userId,
          amount: params.amount,
          paymentMethod: params.paymentMethod,
          paymentStatus: PaymentStatusEnum.PENDING,
          transactionId,
          paymentGateway: params.paymentMethod === PaymentMethodEnum.COD ? 'CASH' : 'STRIPE',
        },
      });
    }

    return {
      transactionId,
      clientSecret,
      amount: params.amount,
      currency: params.currency || 'usd',
      paymentMethod: params.paymentMethod,
      publishableKey: env.STRIPE_SECRET_KEY ? 'pk_test_placeholder' : null,
    };
  }

  async confirmPayment(transactionId: string, orderId?: string) {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [{ transactionId }, ...(orderId ? [{ orderId }] : [])],
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment transaction record not found.', ErrorCode.NOT_FOUND);
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymentStatus: PaymentStatusEnum.COMPLETED,
      },
    });

    return updated;
  }

  async handleWebhook(event: { type: string; data: { object: { id: string; amount?: number } } }) {
    try {
      if (event.type === 'payment_intent.succeeded') {
        const intentId = event.data.object.id;
        const payment = await prisma.payment.findFirst({
          where: { transactionId: intentId },
        });

        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { paymentStatus: PaymentStatusEnum.COMPLETED },
          });
        }
      } else if (event.type === 'payment_intent.payment_failed') {
        const intentId = event.data.object.id;
        const payment = await prisma.payment.findFirst({
          where: { transactionId: intentId },
        });

        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { paymentStatus: PaymentStatusEnum.FAILED },
          });
        }
      }
    } catch (err: any) {
      console.warn('⚠️ Webhook database processing notice:', err.message);
    }

    return { received: true };
  }
}

export const paymentService = new PaymentService();
