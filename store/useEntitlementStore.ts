import { create } from 'zustand';
import { supabase, isSupabaseReady } from '../services/supabaseClient';
import { api } from '../services/apiClient';
import type { Entitlement, Plan, Subscription, Payment } from '../types';

interface EntitlementState {
  initialized: boolean;
  loading: boolean;
  entitlement: Entitlement;
  subscription: Subscription | null;
  payments: Payment[];
  plans: Plan[];
  lastError: string | null;
  networkUnreachable: boolean;

  reset: () => void;
  refresh: (userId: string) => Promise<void>;
  hasFeature: (feature: keyof Entitlement['features']) => boolean;
  isPro: () => boolean;
}

const FREE_ENTITLEMENT: Entitlement = {
  plan: 'free',
  features: {
    max_quizzes: 3,
    ai_tier: 'basic',
    hide_branding: false,
    premium_templates: false,
    unlimited_logic: false,
  },
  valid_until: null,
  source: 'system',
};

export const useEntitlementStore = create<EntitlementState>((set, get) => ({
  initialized: false,
  loading: false,
  entitlement: FREE_ENTITLEMENT,
  subscription: null,
  payments: [],
  plans: [],
  lastError: null,
  networkUnreachable: false,

  reset: () =>
    set({
      initialized: false,
      loading: false,
      entitlement: FREE_ENTITLEMENT,
      subscription: null,
      payments: [],
      plans: [],
      lastError: null,
      networkUnreachable: false,
    }),

  refresh: async (userId: string) => {
    if (!isSupabaseReady || !supabase) {
      set({ initialized: true, entitlement: FREE_ENTITLEMENT });
      return;
    }

    if (get().networkUnreachable) {
      return;
    }

    set({ loading: true, lastError: null });
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUserId = sessionData.session?.user?.id;
      if (!sessionUserId || sessionUserId !== userId) {
        set({ initialized: true, loading: false, entitlement: FREE_ENTITLEMENT });
        return;
      }

      const data = await api.getEntitlement();

      set({
        initialized: true,
        loading: false,
        entitlement: {
          plan: data.tier || 'free',
          features: {
            max_quizzes: data.quizzes_limit,
            ai_tier: data.ai_questions_limit > 50 ? 'advanced' : 'basic',
            hide_branding: data.has_media_upload || false,
            premium_templates: false,
            unlimited_logic: false,
          },
          valid_until: data.current_period_end || null,
          source: data.tier === 'pro' ? 'admin' : 'system',
        },
        subscription: data.tier === 'pro' ? {
          id: data.yookassa_subscription_id || '',
          plan_id: 'pro_monthly',
          status: data.status || 'active',
          current_period_start: '',
          current_period_end: data.current_period_end || '',
          cancel_at_period_end: false,
          canceled_at: null,
        } : null,
        lastError: null,
      });
    } catch (e) {
      const isNetworkError = e instanceof TypeError && /fetch/i.test(e.message);
      if (isNetworkError) {
        if (import.meta.env.DEV) {
          console.debug('[entitlement] refresh unreachable (using FREE):', e.message);
        } else {
          console.warn('[entitlement] refresh failed (network):', e.message);
        }
        set({
          initialized: true,
          loading: false,
          networkUnreachable: true,
          lastError: (e as Error).message,
        });
      } else {
        console.warn('[entitlement] refresh failed:', e);
        set({
          initialized: true,
          loading: false,
          entitlement: FREE_ENTITLEMENT,
          lastError: e instanceof Error ? e.message : 'unknown',
        });
      }
    }
  },

  hasFeature: (feature) => {
    const ent = get().entitlement;
    if (ent.plan === 'pro') return true;
    const v = ent.features[feature];
    switch (feature) {
      case 'hide_branding':
      case 'premium_templates':
      case 'unlimited_logic':
        return Boolean(v);
      case 'max_quizzes':
        return v === null || (typeof v === 'number' && v >= 1);
      case 'ai_tier':
        return v === 'basic' || v === 'advanced' || v === 'premium';
      default:
        return Boolean(v);
    }
  },

  isPro: () => get().entitlement.plan === 'pro',
}));
