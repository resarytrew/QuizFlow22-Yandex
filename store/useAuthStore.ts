import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import type { Session } from '@supabase/supabase-js';

interface AuthStoreState {
  authInitialized: boolean;
  setAuthInitialized: (initialized: boolean) => void;
  session: Session | null;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  authInitialized: false,
  session: null as Session | null,
};

export const useAuthStore = create<AuthStoreState>((set) => ({
  ...initialState,

  setAuthInitialized: (initialized) => set({ authInitialized: initialized }),
  setSession: (session) => set({ session }),

  signOut: async () => {
    let cleared = false;
    try {
      // 1. Reset all client stores BEFORE clearing the session.
      //    The previous order (clear session first, reset later) exposed
      //    a 1-frame window where the dashboard rendered the previous
      //    user's data because the App-level useEffect([session]) only
      //    resets entitlement+userQuizzes, not the canvas/UI/quiz data.
      const [stores] = await Promise.all([
        Promise.all([
          import('./useCanvasStore'),
          import('./useUIStore'),
          import('./useQuizDataStore'),
          import('./useAIStore'),
          import('./useAutosaveStore'),
          import('./useEntitlementStore'),
          import('./useAdminStore'),
        ]),
        supabase?.auth.signOut().catch(console.warn),
      ]);

      const [canvas, ui, quiz, ai, autosave, entitlement, admin] = stores;
      canvas.useCanvasStore.getState().reset();
      quiz.useQuizDataStore.getState().reset();
      ai.useAIStore.getState().reset();
      autosave.useAutosaveStore.getState().reset();
      entitlement.useEntitlementStore.getState().reset();
      admin.useAdminStore.getState().reset();

      // UI last — reset everything (we no longer touch setDashboardVisible
      // because routing is now driven by TanStack Router, not UI state)
      ui.useUIStore.getState().reset();
      cleared = true;
    } catch (e) {
      console.error('SignOut: store reset failed:', e);
    } finally {
      // Always clear the session last, even if some store reset threw.
      // Without this, a partial failure would leave the previous user's
      // session active and they could see another user's data on reload.
      set({ session: null, authInitialized: true });
    }
    const { router } = await import('../src/router');
    await router.invalidate();
    await router.navigate({ to: '/', replace: true });
  },

  reset: () => set(initialState),
}));
