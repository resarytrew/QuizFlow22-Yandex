import { api } from './apiClient';
import type { PlanId } from '../types';

export type CheckoutPaymentMethod = 'sbp' | 'any';

export class BillingError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export interface RedeemPromoResponse {
  ok: true;
  grant: {
    plan: string;
    valid_until: string;
  };
}

export interface CreateCheckoutResponse {
  confirmation_url: string;
  payment_id: string;
  amount: string;
  currency: string;
}

export async function redeemPromoCode(code: string): Promise<RedeemPromoResponse> {
  return api.redeemPromo(code);
}

export async function createCheckout(
  planId: PlanId,
  _paymentMethod: CheckoutPaymentMethod = 'any',
  _returnPath: string = '/billing/return',
): Promise<CreateCheckoutResponse> {
  const plan = planId === 'pro_yearly' ? 'yearly' : 'monthly';
  const result = await api.createCheckout(plan);
  return {
    confirmation_url: result.confirmation_url,
    payment_id: result.payment_id,
    amount: result.amount.toString(),
    currency: result.currency,
  };
}

export async function cancelSubscription(): Promise<{
  ok: true;
  current_period_end: string;
  cancel_at_period_end: true;
}> {
  const result = await api.cancelSubscription();
  return {
    ok: true,
    current_period_end: result.current_period_end,
    cancel_at_period_end: true,
  };
}
