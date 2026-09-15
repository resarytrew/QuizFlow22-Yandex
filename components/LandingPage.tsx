import React, { useState, useEffect, useRef } from "react";
import { overviewHtml } from "../seo/content";
import {
  StudioCapabilities,
  StudioScenarios,
  StudioProcess,
  StudioAuthor,
  StudioClosing,
  StudioFooter,
} from "./landing/StudioSections";
import FlowStory from "./landing/FlowStory";
import PotokHeader from "./landing/PotokHeader";
import AuthModal from "./modals/AuthModal.tsx";
import LandingPricingSection from "./landing/LandingPricingSection.tsx";
import { useUIStore } from "../store/useUIStore.ts";
import { useAppNavigation } from "@/src/router/useAppNavigation";
import { Link } from "@tanstack/react-router";
import { api } from "../services/apiClient.ts";
import type { PublicQuiz } from "../types.ts";
import { useAuthStore } from "../store/useAuthStore.ts";
import "reactflow/dist/style.css";

export const LANDING_NAV_ITEMS = [
  { label: "Лучшие квизы", target: "templates" },
  { label: "Возможности", target: "features" },
  { label: "Лаборатория", target: "scenario-lab" },
  { label: "Об авторе", target: "author" },
  { label: "Тарифы", target: "pricing" },
] as const;

const useInView = (threshold = 0.2) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && setInView(true),
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, inView] as const;
};

// ============================================
// REVEAL ANIMATION
// ============================================
interface RevealProps {
  delay?: number;
  className?: string;
  direction?: "up" | "down" | "left" | "right";
  disabled?: boolean;
}

const Reveal: React.FC<React.PropsWithChildren<RevealProps>> = ({
  children,
  delay = 0,
  className = "",
  direction = "up",
  disabled = false,
}) => {
  const [ref, inView] = useInView(0.15);

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  const transforms = {
    up: "translate-y-12",
    down: "-translate-y-12",
    left: "translate-x-12",
    right: "-translate-x-12",
  };

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${className} ${
        inView
          ? "opacity-100 translate-x-0 translate-y-0"
          : `opacity-0 ${transforms[direction]}`
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// ============================================
// BRAND TYPOGRAPHY — Уникальный типографический стиль
// ============================================
interface HeadingProps {
  level?: 1 | 2 | 3;
  accent?: string;
  className?: string;
}

const Heading: React.FC<React.PropsWithChildren<HeadingProps>> = ({
  children,
  level = 1,
  accent,
  className = "",
}) => {
  const sizes = {
    1: "text-[4.05rem] leading-[0.94] md:text-[4.85rem] lg:text-[5.45rem]",
    2: "text-[2.6rem] leading-[1.08] md:text-[3.6rem]",
    3: "text-[1.65rem] leading-[1.18] md:text-[2.25rem]",
  };

  return (
    <div
      className={`font-serif font-bold tracking-normal ${sizes[level]} ${className}`}
    >
      {children}
      {accent && (
        <span className="block max-w-[9.4ch] italic tracking-normal text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-orange-600 to-rose-700">
          {accent}
        </span>
      )}
    </div>
  );
};

// Кастомный label с декоративной линией
const Label: React.FC<React.PropsWithChildren<{ className?: string }>> = ({
  children,
  className = "",
}) => (
  <div className={`flex items-center gap-4 ${className}`}>
    <div className="h-px w-8 bg-gradient-to-r from-transparent to-amber-700/45" />
    <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-amber-800/70">
      {children}
    </span>
    <div className="h-px w-8 bg-gradient-to-l from-transparent to-amber-700/45" />
  </div>
);

// ============================================
// CONFETTI
// ============================================

// ============================================
// FEATURES — Карточки со "связями"
// ============================================
export function getFeaturedQuizDescription(quiz: PublicQuiz): string {
  const directDescription = quiz.quiz_data?.description?.trim();
  if (directDescription) return directDescription;

  const passportDescription =
    quiz.quiz_data?.passport?.scenarioDescription?.trim();
  if (passportDescription) return passportDescription;

  const nodes = quiz.quiz_data?.nodes ?? [];
  for (const node of nodes) {
    const data = node?.data;
    const fields = data as Record<string, unknown>;
    for (const value of [fields.description, fields.question, fields.message]) {
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
  }

  return "";
}

const FEATURED_FALLBACK_COVERS = [
  "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=900&auto=format&fit=crop",
];

export function getFeaturedQuizCover(quiz: PublicQuiz, index = 0): string {
  const customCover = quiz.quiz_data?.cover_image_url?.trim();
  if (customCover) return customCover;

  for (const node of quiz.quiz_data?.nodes ?? []) {
    const image =
      node?.data?.imageUrl?.trim() || node?.data?.backgroundImageUrl?.trim();
    if (image) return image;
  }

  return FEATURED_FALLBACK_COVERS[index % FEATURED_FALLBACK_COVERS.length];
}

export function formatFeaturedQuizDate(date: string): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(new Date(date));
}

const FEATURED_NODE_TYPE_LABELS: Record<string, string> = {
  startNode: "Старт",
  questionNode: "Вопрос",
  multipleChoiceNode: "Множественный выбор",
  resultNode: "Финал",
  infoNode: "История",
  conditionNode: "Условие",
  scoreNode: "Очки",
  variableNode: "Переменная",
  formulaNode: "Формула",
  goToNode: "Переход",
  timerNode: "Таймер",
  collectInfoNode: "Сбор данных",
  feedbackNode: "Обратная связь",
  timelineNode: "Хронология",
  matchingNode: "Сопоставление",
  textInputNode: "Ввод текста",
  achievementNode: "Достижение",
  allocatorNode: "Распределение",
  progressionNode: "Прогресс",
  dialogueNode: "Диалог",
};

export interface FeaturedPreviewNode {
  id: string;
  type: string;
  typeLabel: string;
  title: string;
  excerpt: string;
}

export function getFeaturedPlayablePreview(quiz: PublicQuiz, limit = 10) {
  const allNodes = quiz.quiz_data?.nodes ?? [];
  const allEdges = quiz.quiz_data?.edges ?? [];
  if (allNodes.length <= limit) {
    return { nodes: allNodes, edges: allEdges };
  }

  const nodeById = new Map(allNodes.map((node) => [String(node.id), node]));
  const outgoing = new Map<string, typeof allEdges>();
  for (const edge of allEdges) {
    const source = String(edge.source);
    outgoing.set(source, [...(outgoing.get(source) ?? []), edge]);
  }

  const startNode =
    allNodes.find((node) => node.type === "startNode") ?? allNodes[0];
  const queue = startNode ? [String(startNode.id)] : [];
  const selectedIds: string[] = [];
  const visited = new Set<string>();

  while (queue.length > 0 && selectedIds.length < limit) {
    const id = queue.shift()!;
    if (visited.has(id) || !nodeById.has(id)) continue;
    visited.add(id);
    selectedIds.push(id);
    for (const edge of outgoing.get(id) ?? []) {
      queue.push(String(edge.target));
    }
  }

  for (const node of allNodes) {
    if (selectedIds.length >= limit) break;
    const id = String(node.id);
    if (!visited.has(id)) {
      visited.add(id);
      selectedIds.push(id);
    }
  }

  const selectedSet = new Set(selectedIds);
  return {
    nodes: selectedIds.map((id) => nodeById.get(id)),
    edges: allEdges.filter(
      (edge) =>
        selectedSet.has(String(edge.source)) &&
        selectedSet.has(String(edge.target)),
    ),
  };
}

function cleanPreviewText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[*_#>`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getFeaturedPreviewNodes(
  quiz: PublicQuiz,
  limit = 10,
): FeaturedPreviewNode[] {
  return (quiz.quiz_data?.nodes ?? []).slice(0, limit).map((node, index) => {
    const data = (node?.data ?? {}) as Record<string, unknown>;
    const title =
      cleanPreviewText(
        data.title || data.label || data.question || data.characterName,
      ) || `Этап ${index + 1}`;
    const excerpt = cleanPreviewText(
      data.description ||
        data.question ||
        data.dialogueText ||
        data.message ||
        data.buttonText,
    );

    const type = String(node?.type ?? "infoNode");
    return {
      id: String(node?.id ?? index),
      type,
      typeLabel: FEATURED_NODE_TYPE_LABELS[type] || "Этап",
      title,
      excerpt: excerpt === title ? "" : excerpt,
    };
  });
}

interface TemplateGalleryProps {
  onRequireAuthForQuiz: (quizId: string) => void;
}

export function requiresAuthForFullQuiz(isAuthenticated: boolean): boolean {
  return !isAuthenticated;
}

const TemplateGallery = ({ onRequireAuthForQuiz }: TemplateGalleryProps) => {
  const session = useAuthStore((s) => s.session);
  const nav = useAppNavigation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [featuredQuizzes, setFeaturedQuizzes] = useState<PublicQuiz[]>([]);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);
  const [featuredError, setFeaturedError] = useState(false);
  const [previewQuiz, setPreviewQuiz] = useState<PublicQuiz | null>(null);
  const [playablePreviewHtml, setPlayablePreviewHtml] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    const loadFeaturedQuizzes = async () => {
      try {
        const data = await api.listPublicQuizzes();
        if (isMounted) {
          setFeaturedQuizzes(
            data.filter((quiz) => quiz.is_favorite).slice(0, 8) as PublicQuiz[],
          );
        }
      } catch (error) {
        console.warn("Failed to load featured quizzes:", error);
        if (isMounted) setFeaturedError(true);
      }
      if (isMounted) setIsLoadingFeatured(false);
    };

    void loadFeaturedQuizzes();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!previewQuiz) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewQuiz(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [previewQuiz]);

  useEffect(() => {
    let cancelled = false;
    if (!previewQuiz) {
      setPlayablePreviewHtml(null);
      return;
    }

    setPlayablePreviewHtml(null);
    const buildPreview = async () => {
      if (previewQuiz.is_summary) {
        const full = await api.getQuiz(previewQuiz.id);
        if (!cancelled)
          setPreviewQuiz({
            ...previewQuiz,
            quiz_data: full.quiz_data,
            is_summary: false,
          });
        return;
      }
      const { generateQuizHtml } = await import("../services/quizGenerator");
      if (cancelled) return;
      const preview = getFeaturedPlayablePreview(previewQuiz);
      const html = generateQuizHtml(
        {
          nodes: preview.nodes,
          edges: preview.edges,
          globalTimer: previewQuiz.quiz_data.globalTimer,
          designSettings: previewQuiz.quiz_data
            .designSettings as unknown as Readonly<Record<string, unknown>>,
          templateId: previewQuiz.quiz_data.templateId,
          currentQuizName: previewQuiz.name,
        },
        { preview: true },
      );
      if (!cancelled) setPlayablePreviewHtml(html);
    };

    void buildPreview().catch((error) => {
      console.error("Failed to load quiz preview", error);
      if (!cancelled)
        setPlayablePreviewHtml(
          "<p>Не удалось загрузить предпросмотр. Закройте его и попробуйте ещё раз.</p>",
        );
    });
    return () => {
      cancelled = true;
    };
  }, [previewQuiz]);

  const hasFeaturedQuizzes = featuredQuizzes.length > 0;
  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -360 : 360,
      behavior: "smooth",
    });
  };

  return (
    <section id="templates" className="scroll-mt-24 py-24 lg:py-32">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <Reveal>
              <Label className="mb-6">Выбор автора</Label>
            </Reveal>
            <Reveal delay={100}>
              <Heading level={2} className="text-stone-950">
                Лучшие квизы
              </Heading>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <p className="text-stone-600 max-w-sm text-lg">
              Избранные опубликованные проекты, которые лучше всего показывают
              возможности платформы.
            </p>
          </Reveal>
        </div>

        {!isLoadingFeatured && !hasFeaturedQuizzes && (
          <div className="studio-gallery-empty">
            <strong>
              {featuredError
                ? "Не удалось загрузить подборку"
                : "Ваша история может оказаться здесь"}
            </strong>
            <p>
              {featuredError
                ? "Попробуйте открыть галерею или вернитесь немного позже."
                : "Избранные проекты появятся в этой подборке. А пока можно посмотреть опубликованные квизы или начать с шаблона."}
            </p>
            <Link
              to={featuredError ? "/public" : "/templates"}
              className="studio-text-link"
            >
              {featuredError ? "Открыть галерею" : "Выбрать шаблон"} ↗
            </Link>
          </div>
        )}
        {/* Carousel with custom cards */}
        <div className="relative -mx-6">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#f3f3ef] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#f3f3ef] to-transparent z-10 pointer-events-none" />

          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto pb-8 px-6 scrollbar-hide snap-x snap-mandatory"
          >
            {isLoadingFeatured &&
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`featured-skeleton-${i}`}
                  className="snap-start shrink-0 w-[310px] sm:w-[370px] overflow-hidden rounded-[2rem_0.75rem_2rem_0.75rem] border border-stone-900/10 bg-white/55 animate-pulse"
                >
                  <div className="aspect-[16/10] bg-stone-900/[0.06]" />
                  <div className="h-40 bg-stone-900/[0.025]" />
                </div>
              ))}
            {!isLoadingFeatured &&
              hasFeaturedQuizzes &&
              featuredQuizzes.map((quiz, i) => {
                const description = getFeaturedQuizDescription(quiz);
                const cover = getFeaturedQuizCover(quiz, i);
                const date = formatFeaturedQuizDate(quiz.published_at);
                return (
                  <Reveal
                    key={quiz.id}
                    delay={i * 50}
                    className={`snap-start shrink-0 w-[310px] sm:w-[370px] ${i % 2 === 1 ? "sm:pt-8" : ""}`}
                  >
                    <article
                      onClick={() => setPreviewQuiz(quiz)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setPreviewQuiz(quiz);
                        }
                      }}
                      role="link"
                      tabIndex={0}
                      className="group relative h-full min-h-[430px] overflow-hidden rounded-[2rem_0.75rem_2rem_0.75rem] border border-stone-900/10 bg-[linear-gradient(155deg,rgba(255,255,255,0.92),rgba(248,247,242,0.82)_48%,rgba(229,228,222,0.52))] cursor-pointer shadow-[0_24px_65px_rgba(68,64,60,0.12)] backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:border-amber-700/24 hover:shadow-[0_32px_80px_rgba(68,64,60,0.15),0_0_38px_rgba(180,83,9,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/70 active:translate-y-0"
                    >
                      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-amber-400/18 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
                      <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-rose-500/[0.08] blur-3xl" />

                      <div
                        className="relative aspect-[16/10] overflow-hidden bg-white/5"
                        style={{
                          clipPath:
                            "polygon(0 0, 100% 0, 100% 88%, 72% 100%, 0 92%)",
                        }}
                      >
                        <img
                          src={cover}
                          alt={`Обложка квиза «${quiz.name}»`}
                          loading="lazy"
                          className="h-full w-full object-cover saturate-[0.86] contrast-[1.04] transition-all duration-700 group-hover:scale-[1.055] group-hover:saturate-100"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/62 via-transparent to-black/5" />
                        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(251,191,36,0.15),transparent_38%,rgba(244,63,94,0.07))] mix-blend-screen" />
                        {date && (
                          <span className="absolute left-4 top-4 border border-amber-200/55 bg-stone-950/72 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-100 shadow-lg backdrop-blur-md tabular-nums">
                            {date}
                          </span>
                        )}
                        <div className="absolute bottom-5 right-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">
                          <span className="h-px w-8 bg-gradient-to-r from-transparent to-amber-300/80" />
                          Избранное
                        </div>
                      </div>

                      <div className="relative flex min-h-[178px] flex-col px-6 pb-6 pt-3">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="h-px flex-1 bg-gradient-to-r from-amber-700/35 via-stone-900/10 to-transparent" />
                          <span className="font-mono text-[10px] tracking-[0.18em] text-stone-500">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                        </div>

                        <h3 className="font-serif text-[25px] font-bold leading-[1.08] tracking-[-0.025em] text-stone-950 text-balance transition-colors duration-300 group-hover:text-amber-800">
                          {quiz.name}
                        </h3>
                        {description && (
                          <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-stone-600 text-pretty">
                            {description}
                          </p>
                        )}

                        <div className="mt-auto flex items-end justify-between pt-5">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500 transition-colors group-hover:text-stone-800">
                            Смотреть превью
                          </span>
                          <span className="flex h-10 w-10 items-center justify-center rounded-[0.75rem_0.25rem_0.75rem_0.25rem] border border-amber-700/25 bg-amber-300 text-[#171109] shadow-[0_8px_24px_rgba(180,83,9,0.16)] transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:bg-amber-200">
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.2}
                                d="M7 17L17 7M8 7h9v9"
                              />
                            </svg>
                          </span>
                        </div>
                      </div>

                      <span className="pointer-events-none absolute bottom-0 left-0 h-14 w-px bg-gradient-to-t from-amber-400/60 to-transparent" />
                      <span className="pointer-events-none absolute bottom-0 left-0 h-px w-14 bg-gradient-to-r from-amber-400/60 to-transparent" />
                    </article>
                  </Reveal>
                );
              })}
          </div>
        </div>

        {/* Controls */}
        {hasFeaturedQuizzes && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              onClick={() => scroll("left")}
              className="p-3 rounded-full border border-stone-900/10 hover:border-amber-700/30 hover:bg-white/60 text-stone-700 transition-all"
              aria-label="Назад"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <Link
              to="/public"
              className="px-6 py-3 rounded-full bg-stone-950 hover:bg-stone-800 text-amber-50 font-bold transition-all hover:scale-105 shadow-lg shadow-stone-900/20"
            >
              Все квизы
            </Link>

            <button
              onClick={() => scroll("right")}
              className="p-3 rounded-full border border-stone-900/10 hover:border-amber-700/30 hover:bg-white/60 text-stone-700 transition-all"
              aria-label="Вперёд"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {previewQuiz && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#050506]/92 p-2 backdrop-blur-xl sm:p-5"
          onClick={() => setPreviewQuiz(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Превью квиза «${previewQuiz.name}»`}
        >
          <div
            className="group/frame relative h-[94dvh] w-full max-w-[1500px] rounded-[2.6rem_1rem_2.6rem_1rem] bg-[linear-gradient(145deg,rgba(251,191,36,0.2),rgba(255,255,255,0.07)_24%,rgba(255,255,255,0.025)_68%,rgba(244,63,94,0.13))] p-[7px] shadow-[0_48px_150px_rgba(0,0,0,0.8),0_0_80px_rgba(251,191,36,0.07)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute -inset-5 rounded-[3rem_1.2rem_3rem_1.2rem] border border-amber-300/[0.08]" />
            <div className="pointer-events-none absolute -inset-2 rounded-[2.8rem_1.1rem_2.8rem_1.1rem] border border-white/[0.06]" />
            <div className="pointer-events-none absolute -left-24 top-1/4 h-64 w-64 rounded-full bg-amber-400/[0.07] blur-[100px]" />
            <div className="pointer-events-none absolute -right-24 bottom-1/4 h-64 w-64 rounded-full bg-rose-500/[0.055] blur-[100px]" />

            <span className="pointer-events-none absolute -left-2 top-20 z-30 h-20 w-px bg-gradient-to-b from-transparent via-amber-300/75 to-transparent" />
            <span className="pointer-events-none absolute -left-2 top-20 z-30 h-px w-20 bg-gradient-to-r from-amber-300/75 to-transparent" />
            <span className="pointer-events-none absolute -right-2 bottom-20 z-30 h-20 w-px bg-gradient-to-t from-transparent via-rose-300/55 to-transparent" />
            <span className="pointer-events-none absolute -right-2 bottom-20 z-30 h-px w-20 bg-gradient-to-l from-rose-300/55 to-transparent" />

            <div className="pointer-events-none absolute -left-[5px] top-1/2 z-30 -translate-y-1/2"></div>
            <div className="pointer-events-none absolute -right-[5px] top-1/3 z-30"></div>
            <div className="pointer-events-none absolute bottom-[-5px] left-1/3 z-30"></div>

            <div className="pointer-events-none absolute left-10 right-10 top-[3px] z-30 flex items-center gap-3">
              <span className="h-px w-12 bg-gradient-to-r from-transparent to-amber-300/65" />
              <span className="font-mono text-[8px] font-bold uppercase tracking-[0.32em] text-amber-200/45">
                Поток / interactive preview
              </span>
              <span className="h-px flex-1 bg-gradient-to-r from-amber-300/30 via-white/[0.06] to-transparent" />
            </div>

            <div className="relative h-full w-full overflow-hidden rounded-[2.2rem_0.7rem_2.2rem_0.7rem] border border-white/[0.09] bg-[#050506] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),inset_0_0_0_1px_rgba(0,0,0,0.8)]">
              <div className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] ring-1 ring-inset ring-amber-200/[0.045]" />

              <button
                type="button"
                onClick={() => setPreviewQuiz(null)}
                className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/65 text-2xl text-white/70 shadow-xl backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-105 hover:border-amber-300/45 hover:text-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                aria-label="Закрыть превью"
              >
                ×
              </button>

              <button
                type="button"
                onClick={() => {
                  setPreviewQuiz(null);
                  if (requiresAuthForFullQuiz(Boolean(session))) {
                    onRequireAuthForQuiz(previewQuiz.id);
                  } else {
                    void nav.goToPlay(previewQuiz.id);
                  }
                }}
                className="group absolute bottom-4 right-4 z-20 inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 py-2 pl-6 pr-2 text-sm font-bold text-[#171109] shadow-[0_16px_45px_rgba(0,0,0,0.42),0_0_30px_rgba(251,191,36,0.13)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.025] hover:from-amber-200 hover:to-orange-300 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
              >
                Открыть весь квиз
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#171109]/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-105">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.2}
                      d="M5 12h14m-6-6 6 6-6 6"
                    />
                  </svg>
                </span>
              </button>

              {playablePreviewHtml ? (
                <iframe
                  key={previewQuiz.id}
                  srcDoc={playablePreviewHtml}
                  title={`Превью квиза «${previewQuiz.name}»`}
                  className="absolute inset-0 h-full w-full border-0 bg-white"
                  sandbox="allow-scripts allow-same-origin"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="relative h-12 w-12">
                    <div className="absolute inset-0 rounded-full border border-amber-300/20" />
                    <div className="absolute inset-1 animate-spin rounded-full border-2 border-transparent border-t-amber-300" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                    Подготавливаем превью
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

// ============================================
// AUTHOR — Личный блок с характером
// ============================================
const LandingPage: React.FC = () => {
  const isAuthModalOpen = useUIStore((s) => s.isAuthModalOpen);
  const setAuthModalOpen = useUIStore((s) => s.setAuthModalOpen);
  const nav = useAppNavigation();
  const session = useAuthStore((s) => s.session);
  const [pendingQuizId, setPendingQuizId] = useState<string | null>(null);

  const handleCTA = () => {
    if (session) {
      void nav.goToNewEditor();
      return;
    }
    setAuthModalOpen(true);
  };

  const handleRequireAuthForQuiz = (quizId: string) => {
    setPendingQuizId(quizId);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    if (!pendingQuizId) return;
    const quizId = pendingQuizId;
    setPendingQuizId(null);
    void nav.goToPlay(quizId);
  };

  const handleAuthClose = () => {
    setAuthModalOpen(false);
    setPendingQuizId(null);
  };

  return (
    <div className="potok-landing min-h-screen flex flex-col">
      <PotokHeader onCTA={handleCTA} />
      <main className="flex-1">
        <FlowStory onCTA={handleCTA} />
        <div className="potok-content">
          <TemplateGallery onRequireAuthForQuiz={handleRequireAuthForQuiz} />
          <StudioCapabilities />
          <StudioScenarios />
          <StudioProcess onCTA={handleCTA} />
          <StudioAuthor />
          <LandingPricingSection theme="light" />
          <details className="studio-about-details">
            <summary>Подробнее о конструкторе и его возможностях</summary>
            <div
              className="potok-seo"
              dangerouslySetInnerHTML={{
                __html: overviewHtml()
                  .replace(/<h1>/g, "<h2>")
                  .replace(/<\/h1>/g, "</h2>"),
              }}
            />
          </details>
          <StudioClosing onCTA={handleCTA} />
          <StudioFooter />
        </div>
      </main>

      <AuthModal
        id="auth-modal"
        isOpen={isAuthModalOpen}
        onClose={handleAuthClose}
        onSuccess={handleAuthSuccess}
        initialMode={pendingQuizId ? "sign-up" : "sign-in"}
      />

      {/* Global Styles */}
      <style>{`
                .bg-noise {
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
                }
                
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

                .landing-flow-scene {
                    --flow-x: 0;
                    --flow-y: 0;
                    perspective: 1200px;
                }

                .landing-react-flow {
                    background: transparent;
                    font-family: inherit;
                }

                .landing-react-flow .react-flow__pane {
                    cursor: grab;
                }

                .landing-react-flow .react-flow__pane:active {
                    cursor: grabbing;
                }

                .landing-react-flow .react-flow__handle {
                    opacity: 0;
                    pointer-events: none;
                }

                .landing-react-flow .react-flow__edge-path {
                    stroke-linecap: round;
                    filter: drop-shadow(0 10px 18px rgba(180, 83, 9, 0.14));
                }

                .landing-react-flow .react-flow__background {
                    opacity: 0.7;
                }

                .landing-react-flow .react-flow__attribution {
                    display: none;
                }
                
                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float { animation: float 3s ease-in-out infinite; }
                
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow { animation: spin-slow linear infinite; }
                
                @keyframes scroll-down {
                    0% { transform: translateY(-100%); opacity: 0; }
                    30% { opacity: 1; }
                    70% { opacity: 1; }
                    100% { transform: translateY(200%); opacity: 0; }
                }
                .animate-scroll-down { animation: scroll-down 2s ease-in-out infinite; }
                
                @keyframes flow {
                    0% { stroke-dashoffset: 0; }
                    100% { stroke-dashoffset: -20; }
                }
                .animate-flow { 
                    stroke-dasharray: 10 5;
                    animation: flow 1s linear infinite;
                }
                
                @keyframes gradient-x {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradient-x {
                    background-size: 200% 200%;
                    animation: gradient-x 3s ease infinite;
                }

                @media (prefers-reduced-motion: reduce) {
                    .landing-flow-scene *,
                    .animate-float,
                    .animate-flow,
                    .animate-gradient-x,
                    .animate-spin-slow {
                        animation: none !important;
                        transition-duration: 0.01ms !important;
                    }
                }
            `}</style>
    </div>
  );
};

export default LandingPage;
