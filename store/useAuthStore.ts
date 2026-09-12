import { create } from 'zustand';
import { authClient, type AuthUser } from '../services/authClient';

interface AuthStoreState {
  authInitialized: boolean;
  user: AuthUser | null;
  session: { user: AuthUser } | null;
  isAuthenticated: boolean;
  setAuthInitialized: (initialized: boolean) => void;
  setUser: (user: AuthUser | null) => void;
  signOut: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  authInitialized: false,
  user: null as AuthUser | null,
  session: null as { user: AuthUser } | null,
  isAuthenticated: false,
};

export const useAuthStore = create<AuthStoreState>((set) => ({
  ...initialState,
  setAuthInitialized: (initialized) => set({ authInitialized: initialized }),
  setUser: (user) => set({ user, session: user ? { user } : null, isAuthenticated: Boolean(user) }),
  signOut: async () => {
    try {
      await authClient.logout().catch((error) => console.warn('Logout request failed:', error));
      const stores = await Promise.all([
        import('./useCanvasStore'), import('./useUIStore'), import('./useQuizDataStore'),
        import('./useAIStore'), import('./useAutosaveStore'), import('./useEntitlementStore'), import('./useAdminStore'),
      ]);
      const [canvas, ui, quiz, ai, autosave, entitlement, admin] = stores;
      canvas.useCanvasStore.getState().reset();
      quiz.useQuizDataStore.getState().reset();
      ai.useAIStore.getState().reset();
      autosave.useAutosaveStore.getState().reset();
      entitlement.useEntitlementStore.getState().reset();
      admin.useAdminStore.getState().reset();
      ui.useUIStore.getState().reset();
    } finally {
      set({ user: null, session: null, isAuthenticated: false, authInitialized: true });
    }
    const { router } = await import('../src/router');
    await router.invalidate();
    await router.navigate({ to: '/', replace: true });
  },
  reset: () => set(initialState),
}));
