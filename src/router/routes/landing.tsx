import { createRoute, redirect } from '@tanstack/react-router';
import { useEffect } from 'react';
import { z } from 'zod';
import { Route as publicShellRoute } from './publicShell';
import { useUIStore } from '../../../store/useUIStore';
import LandingPage from '../../../components/LandingPage';

export const landingSearchSchema = z.object({
  play: z.string().optional(),
  status: z.enum(['success', 'cancel', 'pending']).optional(),
  code: z.string().optional(),
  token_hash: z.string().optional(),
  type: z.string().optional(),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
  page: z.string().optional(),
  authModal: z.literal('open').optional(),
});

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createRoute({
  getParentRoute: () => publicShellRoute,
  path: '/',
  validateSearch: landingSearchSchema,
  beforeLoad: ({ search }) => {
    if (search.play && UUID_RE.test(search.play)) {
      throw redirect({
        to: '/play/$quizId',
        params: { quizId: search.play },
        replace: true,
      });
    }
    if (search.status) {
      throw redirect({
        to: '/billing/return',
        search: { status: search.status },
        replace: true,
      });
    }
    if (search.code || search.token_hash || search.error || search.access_token) {
      throw redirect({
        to: '/auth/confirm',
        search: {
          code: search.code,
          token_hash: search.token_hash,
          type: search.type,
          access_token: search.access_token,
          refresh_token: search.refresh_token,
          error: search.error,
          error_description: search.error_description,
        },
        replace: true,
      });
    }
    if (search.page === 'guide') {
      throw redirect({ to: '/guide', replace: true });
    }

  },
  component: LandingRoutePage,
});

function LandingRoutePage() {
  const { authModal } = Route.useSearch();
  const setAuthModalOpen = useUIStore((s) => s.setAuthModalOpen);

  useEffect(() => {
    if (authModal === 'open') setAuthModalOpen(true);
  }, [authModal, setAuthModalOpen]);

  return <LandingPage />;
}
