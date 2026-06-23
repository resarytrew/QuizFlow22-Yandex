import { useNavigate } from '@tanstack/react-router';
import { useQuizDataStore } from '../../store/useQuizDataStore';
import type { Quiz, PublicQuiz, QuizTemplate } from '../../types';

/**
 * Единый хук для навигации приложения.
 * Использовать везде вместо прямых вызовов useNavigate.
 *
 * Преимущества:
 * - одно место для всей навигационной логики,
 * - типобезопасность,
 * - легко мокается в тестах.
 */
export function useAppNavigation() {
  const navigate = useNavigate();

  return {
    // ─── Public ──────────────────────────────────────────────────────────────

    goToLanding: () => navigate({ to: '/' }),

    goToDocs: () => navigate({ to: '/docs' }),

    goToGuide: () => navigate({ to: '/guide' }),

    goToTemplates: () => navigate({ to: '/templates' }),

    goToPublicGallery: () => navigate({ to: '/public' }),

    goToContest: () => navigate({ to: '/contest' }),

    goToWelcome: () => navigate({ to: '/welcome' }),

    // ─── Auth ─────────────────────────────────────────────────────────────────

    goToDashboard: () => navigate({ to: '/dashboard' }),

    goToBilling: () => navigate({ to: '/billing' }),

    goToAdminLogin: () => navigate({ to: '/admin/login' }),

    goToAdminMfa: () => navigate({ to: '/admin/mfa' }),

    goToAdmin: () => navigate({ to: '/admin' }),

    goToAdminUsers: () => navigate({ to: '/admin/users' }),

    goToAdminQuizzes: () => navigate({ to: '/admin/quizzes' }),

    // ─── Play ─────────────────────────────────────────────────────────────────

    goToPlay: (quizId: string) =>
      navigate({
        to: '/play/$quizId',
        params: { quizId },
      }),

    // ─── Editor ───────────────────────────────────────────────────────────────

    goToNewEditor: () => navigate({ to: '/editor' }),

    goToEditor: (quizId: string) =>
      navigate({
        to: '/editor/$quizId',
        params: { quizId },
      }),

    // ─── Combined: load + navigate ────────────────────────────────────────────

    openQuizInEditor: async (quiz: Quiz) => {
      await navigate({
        to: '/editor/$quizId',
        params: { quizId: quiz.id },
      });
    },

    createAndOpenEditor: async (template?: QuizTemplate) => {
      if (template) {
        useQuizDataStore.getState().setPendingTemplate(template);
      }
      await navigate({ to: '/editor' });
    },

    clonePublicQuizAndEdit: async (publicQuiz: PublicQuiz) => {
      const newId = await useQuizDataStore
        .getState()
        .cloneAndEditPublicQuiz(publicQuiz);
      if (newId) {
        await navigate({
          to: '/editor/$quizId',
          params: { quizId: newId },
        });
      }
    },

    duplicateAndOpen: async (quizId: string) => {
      const newId = await useQuizDataStore.getState().duplicateQuiz(quizId);
      if (newId) {
        await navigate({
          to: '/editor/$quizId',
          params: { quizId: newId },
        });
      }
    },
  };
}
