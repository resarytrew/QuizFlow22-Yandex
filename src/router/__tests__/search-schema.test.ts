import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../components/LandingPage', () => ({ default: () => null }));
vi.mock('../../../components/QuizPlayer', () => ({ default: () => null }));
vi.mock('../../../components/BillingReturnPage', () => ({ default: () => null }));
vi.mock('../../../components/auth/EmailConfirmPage', () => ({ default: () => null }));

describe('router search schemas', () => {
  it('normalizes play preview values', async () => {
    const { playSearchSchema } = await import('../routes/playQuiz');

    expect(playSearchSchema.parse({ preview: 'true' }).preview).toBe(true);
    expect(playSearchSchema.parse({ preview: '1' }).preview).toBe(true);
    expect(playSearchSchema.parse({ preview: 'false' }).preview).toBe(false);
    expect(playSearchSchema.parse({}).preview).toBe(false);
  });

  it('validates billing return status', async () => {
    const { billingReturnSearchSchema } = await import('../routes/billingReturn');

    expect(
      billingReturnSearchSchema.parse({ status: 'success', orderId: '42' })
    ).toEqual({ status: 'success', orderId: '42' });
    expect(() =>
      billingReturnSearchSchema.parse({ status: 'unknown' })
    ).toThrow();
  });

  it('keeps supported QuizFlow auth callback parameters', async () => {
    const { authConfirmSearchSchema } = await import('../routes/authConfirm');

    expect(
      authConfirmSearchSchema.parse({
        status: 'success',
        link: 'required',
        email: 'user@example.com',
        error: 'access_denied',
      })
    ).toEqual({
      status: 'success',
      link: 'required',
      email: 'user@example.com',
      error: 'access_denied',
    });
  });

  it('accepts the billing auth modal search parameter on landing', async () => {
    const { landingSearchSchema } = await import('../routes/landing');

    expect(landingSearchSchema.parse({ authModal: 'open' })).toEqual({
      authModal: 'open',
    });
    expect(() => landingSearchSchema.parse({ authModal: 'closed' })).toThrow();
  });
});
