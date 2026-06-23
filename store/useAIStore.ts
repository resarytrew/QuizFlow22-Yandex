import { create } from 'zustand';
import { callOpenRouter, AI_MODEL } from '../services/openRouterClient';
import { generateImage as generateImageViaProxy } from '../services/aiProxy';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';
import { useCanvasStore } from './useCanvasStore';
import { useAuthStore } from './useAuthStore';
import type { CustomNodeType, NodeData } from '../types';

// --- Types ---

export type AIQuizIdea = {
  title: string;
  description: string;
};

export type SectionType = 'intro' | 'body' | 'conclusion';

export interface AISuggestion {
  title: string;
  description: string;
  newNode: {
    type: CustomNodeType;
    data: Partial<NodeData>;
  };
}

// --- JSON parsing helper ---

const parseAIResponse = <T,>(raw: string): T => {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned);
};

// --- Store ---

interface AIStoreState {
  isAILoading: boolean;
  setAILoading: (loading: boolean) => void;
  aiSuggestions: AISuggestion[];
  setAISuggestions: (suggestions: AISuggestion[]) => void;
  aiGeneratedImage: string | null;
  setAIGeneratedImage: (url: string | null) => void;
  generatedFeedback: { title: string; message: string; targetHandle: string }[];
  clearAIState: () => void;

  // Stubs with correct signatures
  generateDetailedPlan: (idea: AIQuizIdea, section: SectionType) => void;
  generateQuizFromIdea: (idea: AIQuizIdea) => void;
  analyzeQuizComplexity: () => void;

  // Real implementations
  generateImage: (prompt: string, type: 'node' | 'background') => Promise<void>;
  generateNodeFeedback: (nodeId: string) => Promise<void>;
  saveGeneratedImageToLibrary: () => Promise<void>;

  // Reset
  reset: () => void;
}

const initialState = {
  isAILoading: false,
  aiSuggestions: [] as AISuggestion[],
  aiGeneratedImage: null as string | null,
  generatedFeedback: [] as { title: string; message: string; targetHandle: string }[],
};

export const useAIStore = create<AIStoreState>((set, get) => ({
  ...initialState,

  setAILoading: (loading) => set({ isAILoading: loading }),
  setAISuggestions: (suggestions) => set({ aiSuggestions: suggestions }),
  setAIGeneratedImage: (url) => set({ aiGeneratedImage: url }),
  clearAIState: () => set({ aiSuggestions: [], aiGeneratedImage: null, generatedFeedback: [] }),

  // Stubs with correct parameter signatures
  generateDetailedPlan: (_idea: AIQuizIdea, _section: SectionType) => {
    toast.error('Функция в разработке');
  },
  generateQuizFromIdea: (_idea: AIQuizIdea) => {
    toast.error('Функция в разработке');
  },
  analyzeQuizComplexity: () => {
    toast.error('Функция в разработке');
  },

  generateImage: async (prompt, type) => {
    if (!prompt.trim()) {
      toast.error('Введите описание');
      return;
    }
    set({ isAILoading: true, aiGeneratedImage: null });
    const toastId = toast.loading('Генерация изображения...');
    try {
      const imageUrl = await generateImageViaProxy(prompt, type || 'node');
      if (!imageUrl) throw new Error('No image generated');
      set({ aiGeneratedImage: imageUrl });
      toast.success('Изображение готово!');
    } catch (error: any) {
      console.error('Image Gen Error:', error);
      toast.error(error.message || 'Ошибка генерации');
    } finally {
      toast.dismiss(toastId);
      set({ isAILoading: false });
    }
  },

  generateNodeFeedback: async (nodeId) => {
    const { nodes } = useCanvasStore.getState();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    set({ isAILoading: true });
    const toastId = toast.loading('Анализ узла...');

    try {
      const context = JSON.stringify(node.data);
      const prompt = `Ты методист. Проанализируй этот узел квиза: ${context}. Создай JSON массив объектов обратной связи (title, message, targetHandle) для ответов.`;

      const response = await callOpenRouter(AI_MODEL, prompt, true);

      let feedbackData: unknown;
      try {
        feedbackData = parseAIResponse(response);
      } catch {
        throw new Error('AI вернул невалидный JSON');
      }

      if (!Array.isArray(feedbackData)) {
        throw new Error('Ожидался массив от AI');
      }

      // Validate each item
      const validFeedback = feedbackData.filter(
        (item): item is { title: string; message: string; targetHandle: string } =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as any).title === 'string' &&
          typeof (item as any).message === 'string'
      );

      set({ generatedFeedback: validFeedback });
      toast.success(`Сгенерировано ${validFeedback.length} вариантов фидбэка`);
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message);
    } finally {
      toast.dismiss(toastId);
      set({ isAILoading: false });
    }
  },

  saveGeneratedImageToLibrary: async () => {
    const { aiGeneratedImage } = get();
    const session = useAuthStore.getState().session;
    if (!aiGeneratedImage || !session) return;

    try {
      const res = await fetch(aiGeneratedImage);
      const blob = await res.blob();
      const fileName = `ai_gen_${Date.now()}.png`;

      const { uploadUrl } = await api.getUploadUrl(fileName, 'image/png');
      await fetch(uploadUrl, { method: 'PUT', body: blob });
      toast.success('Сохранено в медиатеку');
    } catch (e: any) {
      toast.error('Ошибка сохранения: ' + e.message);
    }
  },

  reset: () => set(initialState),
}));
