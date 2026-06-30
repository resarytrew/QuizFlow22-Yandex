import {
  type ChangeEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';
import toast from 'react-hot-toast';
import { useAppNavigation } from '../../src/router/useAppNavigation';
import { generateQuizHtmlProgrammatically } from '../../services/quizGenerator';
import {
  estimateScreenQuizVideoDurationMs,
  exportScreenQuizToMp4,
} from '../../services/screenQuizVideoExport';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useQuizDataStore } from '../../store/useQuizDataStore';
import type { QuizVisibility } from '../../types';
import {
  downloadQuizFile,
  parseQuizFile,
  serializeQuizFile,
} from './quizFile';

interface UseHeaderControllerOptions {
  currentQuizId: string | null;
  currentQuizName: string;
  importLocked: boolean;
  saveQuiz: (options?: {
    visibility?: QuizVisibility;
  }) => Promise<string | null>;
  setCanvasLoading: (loading: boolean) => void;
  setNodes: ReturnType<typeof useCanvasStore.getState>['setNodes'];
  setEdges: ReturnType<typeof useCanvasStore.getState>['setEdges'];
}

export function buildScreenQuizMp4Html(): string {
  const canvas = useCanvasStore.getState();
  const quiz = useQuizDataStore.getState();

  return generateQuizHtmlProgrammatically(
    canvas.nodes,
    canvas.edges,
    quiz.globalTimer,
    quiz.designSettings,
    quiz.currentQuizId,
    quiz.templateId,
    quiz.currentQuizName,
    { preview: true },
  );
}

export function useHeaderController({
  currentQuizId,
  currentQuizName,
  importLocked,
  saveQuiz,
  setCanvasLoading,
  setNodes,
  setEdges,
}: UseHeaderControllerOptions) {
  const nav = useAppNavigation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [isHtmlModalOpen, setIsHtmlModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isGlobalSettingsModalOpen, setIsGlobalSettingsModalOpen] =
    useState(false);
  const [isConfirmClearModalOpen, setIsConfirmClearModalOpen] = useState(false);
  const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCanvasLoading(isPending);
  }, [isPending, setCanvasLoading]);

  const buildQuizHtml = (preview: boolean) => {
    const canvas = useCanvasStore.getState();
    const quiz = useQuizDataStore.getState();
    return generateQuizHtmlProgrammatically(
      canvas.nodes,
      canvas.edges,
      quiz.globalTimer,
      quiz.designSettings,
      quiz.currentQuizId,
      quiz.templateId,
      quiz.currentQuizName,
      preview ? { preview: true } : undefined,
    );
  };

  const generateHtml = (preview: boolean) => {
    const html = buildQuizHtml(preview);
    setGeneratedHtml(html);
    if (preview) setIsPreviewModalOpen(true);
    else setIsHtmlModalOpen(true);
  };

  const handleExportJson = () => {
    const canvas = useCanvasStore.getState();
    const quiz = useQuizDataStore.getState();
    downloadQuizFile(
      serializeQuizFile({
        nodes: canvas.nodes,
        edges: canvas.edges,
        globalTimer: quiz.globalTimer,
        designSettings: quiz.designSettings,
        templateId: quiz.templateId,
        currentQuizName: quiz.currentQuizName,
      }),
      currentQuizName,
    );
  };

  const handleExportMp4 = async () => {
    const canvas = useCanvasStore.getState();
    const quiz = useQuizDataStore.getState();

    if (quiz.templateId !== 'screenQuiz') {
      toast.error('Экспорт MP4 доступен только для шаблона «Экранная викторина».');
      return;
    }

    const html = buildScreenQuizMp4Html();
    const durationMs = estimateScreenQuizVideoDurationMs(canvas.nodes, quiz.designSettings);
    const toastId = toast.loading('Готовлю MP4: выберите открывшееся окно в диалоге захвата экрана.');

    try {
      await exportScreenQuizToMp4({
        htmlContent: html,
        fileName: quiz.currentQuizName || currentQuizName,
        durationMs,
      });
      toast.success('MP4 экспортирован', { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось экспортировать MP4.', { id: toastId });
    }
  };

  const handleImportClick = () => {
    if (importLocked) {
      toast.error('Импорт JSON доступен только в PRO');
      void nav.goToBilling();
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        toast.error('Не удалось прочитать JSON-файл.');
        return;
      }

      try {
        const quizFile = parseQuizFile(reader.result);
        startTransition(() => {
          setNodes(quizFile.nodes);
          setEdges(quizFile.edges);
          const quizStore = useQuizDataStore.getState();
          if (quizFile.globalTimer) {
            quizStore.setGlobalTimer(quizFile.globalTimer);
          }
          if (quizFile.designSettings) {
            quizStore.updateDesignSettings(quizFile.designSettings);
          }
          if (quizFile.templateId) {
            quizStore.setTemplateId(quizFile.templateId);
          }
          if (quizFile.currentQuizName) {
            quizStore.setCurrentQuizName(quizFile.currentQuizName);
          }
        });
        toast.success('Шаблон загружен');
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Ошибка при чтении JSON-файла.',
        );
      }
    };
    reader.onerror = () => toast.error('Не удалось прочитать JSON-файл.');
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!currentQuizId) {
      setIsSaveAsModalOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      await saveQuiz();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAsConfirm = async (visibility: QuizVisibility) => {
    setIsSaving(true);
    try {
      const savedQuizId = await saveQuiz({ visibility });
      if (savedQuizId && !currentQuizId) {
        await nav.goToEditor(savedQuizId);
      }
      setIsSaveAsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    fileInputRef,
    generatedHtml,
    isHtmlModalOpen,
    setIsHtmlModalOpen,
    isPreviewModalOpen,
    setIsPreviewModalOpen,
    isGlobalSettingsModalOpen,
    setIsGlobalSettingsModalOpen,
    isConfirmClearModalOpen,
    setIsConfirmClearModalOpen,
    isSaveAsModalOpen,
    setIsSaveAsModalOpen,
    isSaving,
    handleGenerate: () => generateHtml(false),
    handlePreview: () => generateHtml(true),
    handleExportMp4,
    handleExportJson,
    handleImportClick,
    handleFileChange,
    handleSave,
    handleSaveAsConfirm,
  };
}
