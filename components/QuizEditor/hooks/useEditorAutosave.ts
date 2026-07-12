import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCanvasStore } from '../../../store/useCanvasStore';
import { useQuizDataStore } from '../../../store/useQuizDataStore';
import { useAutosaveStore } from '../../../store/useAutosaveStore';
import { useAuthStore } from '../../../store/useAuthStore';

const AUTOSAVE_DELAY_MS = 1400;

function buildAutosaveSignature(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(Date.now());
  }
}

export function useEditorAutosave() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const currentQuizId = useQuizDataStore((s) => s.currentQuizId);
  const currentQuizName = useQuizDataStore((s) => s.currentQuizName);
  const currentQuizVisibility = useQuizDataStore((s) => s.currentQuizVisibility);
  const globalTimer = useQuizDataStore((s) => s.globalTimer);
  const designSettings = useQuizDataStore((s) => s.designSettings);
  const templateId = useQuizDataStore((s) => s.templateId);
  const autosaveQuiz = useQuizDataStore((s) => s.autosaveQuiz);
  const autosaveCurrentQuiz = useAutosaveStore((s) => s.autosaveCurrentQuiz);

  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(false);
  const latestSignatureRef = useRef<string | null>(null);
  const savedSignatureRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const saveAgainRef = useRef(false);
  const currentQuizIdRef = useRef<string | null>(currentQuizId);

  useEffect(() => {
    currentQuizIdRef.current = currentQuizId;
  }, [currentQuizId]);

  const signature = useMemo(
    () =>
      buildAutosaveSignature({
        nodes,
        edges,
        currentQuizName,
        currentQuizVisibility,
        globalTimer,
        designSettings,
        templateId,
      }),
    [
      nodes,
      edges,
      currentQuizName,
      currentQuizVisibility,
      globalTimer,
      designSettings,
      templateId,
    ],
  );

  useEffect(() => {
    latestSignatureRef.current = signature;
    autosaveCurrentQuiz();

    if (!session) return;

    if (!mountedRef.current) {
      mountedRef.current = true;
      savedSignatureRef.current = signature;
      return;
    }

    if (signature === savedSignatureRef.current) return;

    const save = async () => {
      if (savingRef.current) {
        saveAgainRef.current = true;
        return;
      }

      savingRef.current = true;
      const signatureAtStart = latestSignatureRef.current;
      const wasNewQuiz = !currentQuizIdRef.current;

      try {
        const savedQuizId = await autosaveQuiz();
        if (savedQuizId && signatureAtStart) {
          savedSignatureRef.current = signatureAtStart;
        }

        if (savedQuizId && wasNewQuiz && window.location.hash === '#/editor') {
          await navigate({
            to: '/editor/$quizId',
            params: { quizId: savedQuizId },
            replace: true,
          });
        }
      } finally {
        savingRef.current = false;
        if (saveAgainRef.current) {
          saveAgainRef.current = false;
          void save();
        }
      }
    };

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void save();
    }, AUTOSAVE_DELAY_MS);

    const flush = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      void save();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autosaveCurrentQuiz, autosaveQuiz, navigate, session, signature]);
}
