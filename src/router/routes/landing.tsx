import { createRoute, redirect } from '@tanstack/react-router';
import { useEffect } from 'react';
import { z } from 'zod';
import { Route as publicShellRoute } from './publicShell';
import { useUIStore } from '../../../store/useUIStore';
import LandingPage from '../../../components/LandingPage';

export const landingSearchSchema = z.object({
  play: z.string().optional(),
  status: z.enum(['success', 'cancel', 'pending']).optional(),
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
