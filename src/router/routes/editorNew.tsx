import { createRoute, redirect, lazyRouteComponent } from '@tanstack/react-router';
import { Route as editorShellRoute } from './editorShell';
import { useQuizDataStore } from '../../../store/useQuizDataStore';
import { useCanvasStore } from '../../../store/useCanvasStore';

export const Route = createRoute({
  getParentRoute: () => editorShellRoute,
  path: '/editor',
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/' });
    }
  },
  loader: () => {
    const quizStore = useQuizDataStore.getState();
    const pendingTemplate = quizStore.pendingTemplate;

    quizStore.createNewQuiz();
    if (!pendingTemplate) return;

    useCanvasStore.getState().setNodes(pendingTemplate.nodes);
    useCanvasStore.getState().setEdges(pendingTemplate.edges);
    if (pendingTemplate.globalTimer) {
      quizStore.setGlobalTimer(pendingTemplate.globalTimer);
    }
    if (pendingTemplate.designSettings) {
      quizStore.updateDesignSettings(pendingTemplate.designSettings);
    }
    if (pendingTemplate.templateId) {
      quizStore.setTemplateId(pendingTemplate.templateId);
    }
    quizStore.setCurrentQuizName(
      pendingTemplate.currentQuizName || 'Новый квиз'
    );
    quizStore.setCurrentQuizId(null);
    quizStore.setPendingTemplate(null);
  },
  component: lazyRouteComponent(() => import('../../../components/QuizEditor')),
});
