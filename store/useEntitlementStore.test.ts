import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getEntitlement: vi.fn() }));
vi.mock('../services/apiClient', () => ({ api: mocks }));
vi.mock('./useAuthStore', () => ({ useAuthStore: { getState: () => ({user:{id:'user-1'}}) } }));
import { useEntitlementStore } from './useEntitlementStore';

beforeEach(() => { useEntitlementStore.getState().reset(); mocks.getEntitlement.mockReset(); });

it('can recover Pro after a transient network error without reloading the page', async () => {
  mocks.getEntitlement.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  await useEntitlementStore.getState().refresh('user-1');
  expect(useEntitlementStore.getState().networkUnreachable).toBe(true);
  mocks.getEntitlement.mockResolvedValue({tier:'pro',quizzes_limit:null,ai_questions_limit:200,current_period_end:'2026-11-29T00:00:00Z'});
  await useEntitlementStore.getState().refresh('user-1');
  expect(mocks.getEntitlement).toHaveBeenCalledTimes(2);
  expect(useEntitlementStore.getState()).toMatchObject({networkUnreachable:false,lastError:null,entitlement:{plan:'pro'}});
});
