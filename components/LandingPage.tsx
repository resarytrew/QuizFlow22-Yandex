import React, { useMemo, useState, useEffect, useRef } from "react";
import AuthModal from "./modals/AuthModal.tsx";
import MagneticButton from "./MagneticButton.tsx";
import LandingPricingSection from "./landing/LandingPricingSection.tsx";
import { useUIStore } from "../store/useUIStore.ts";
import { useAppNavigation } from "@/src/router/useAppNavigation";
import { Link } from "@tanstack/react-router";
import { api } from "../services/apiClient.ts";
import type { PublicQuiz } from "../types.ts";
import { useAuthStore } from "../store/useAuthStore.ts";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Handle,
  Position,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";

// ============================================
// DESIGN CONCEPT: "ПОТОК" = СВЯЗИ + ДВИЖЕНИЕ
// Визуальный язык: линии соединений, органические формы,
// перетекающие градиенты, асимметричная типографика
// ============================================

// ============================================
// SVG CONNECTORS — Уникальный брендовый элемент
// Линии, которые визуально "связывают" секции
// ============================================
const FlowLine = ({
  className = "",
  variant = 1,
  animated = true,
}: {
  className?: string;
  variant?: number;
  animated?: boolean;
}) => {
  const paths = [
    "M0,50 Q50,0 100,50 T200,50 T300,50",
    "M0,25 C50,75 100,0 150,50 S250,100 300,50",
    "M0,50 L50,20 L100,60 L150,30 L200,70 L250,40 L300,50",
  ];

  return (
    <svg
      viewBox="0 0 300 100"
      className={`w-full h-auto ${className}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          id={`flow-grad-${variant}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="rgba(180,83,9,0)" />
          <stop offset="50%" stopColor="rgba(180,83,9,0.38)" />
          <stop offset="100%" stopColor="rgba(180,83,9,0)" />
        </linearGradient>
      </defs>
      <path
        d={paths[variant - 1] || paths[0]}
        fill="none"
        stroke={`url(#flow-grad-${variant})`}
        strokeWidth="2"
        strokeLinecap="round"
        className={animated ? "animate-flow" : undefined}
      />
    </svg>
  );
};

// Декоративные точки-узлы (как в графе)
const FlowNode = ({
  size = "md",
  active = false,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  active?: boolean;
  className?: string;
}) => {
  const sizes = { sm: "w-2 h-2", md: "w-3 h-3", lg: "w-4 h-4" };
  return (
    <div className={`relative ${className}`}>
      <div
        className={`${sizes[size]} rounded-full ${active ? "bg-amber-600" : "bg-stone-400/40"} transition-colors duration-500`}
      />
      {active && (
        <div
          className={`absolute inset-0 ${sizes[size]} rounded-full bg-amber-500 animate-ping opacity-30`}
        />
      )}
    </div>
  );
};

type LandingNodeTone = "ink" | "amber" | "rose" | "sage";

interface LandingFlowNodeData extends Record<string, unknown> {
  eyebrow: string;
  title: string;
  detail: string;
  tone: LandingNodeTone;
  surface?: "default" | "editor";
  active?: boolean;
  pulse?: boolean;
  index?: string;
}

const landingNodeToneClass: Record<LandingNodeTone, string> = {
  ink: "border-stone-900/20 bg-stone-950 text-amber-50 shadow-stone-950/20",
  amber: "border-amber-700/25 bg-amber-300 text-stone-950 shadow-amber-700/18",
  rose: "border-rose-700/20 bg-rose-100 text-stone-950 shadow-rose-700/12",
  sage: "border-emerald-800/16 bg-emerald-100 text-stone-950 shadow-emerald-800/10",
};

const editorLandingNodeToneClass: Record<LandingNodeTone, string> = {
  ink: "border-stone-300/70 bg-transparent text-stone-900 shadow-[0_18px_50px_rgba(15,23,42,0.08)]",
  amber: "border-stone-300/70 bg-transparent text-stone-900 shadow-[0_18px_50px_rgba(15,23,42,0.08)]",
  rose: "border-stone-300/70 bg-transparent text-stone-900 shadow-[0_18px_50px_rgba(15,23,42,0.08)]",
  sage: "border-stone-300/70 bg-transparent text-stone-900 shadow-[0_18px_50px_rgba(15,23,42,0.08)]",
};

const LandingFlowNode: React.FC<NodeProps<LandingFlowNodeData>> = ({
  data,
}) => (
  <div
    className={`group relative min-w-[172px] rounded-[1.25rem_0.55rem_1.25rem_0.55rem] border px-4 py-3 shadow-[0_18px_52px_var(--tw-shadow-color)] backdrop-blur transition-all duration-500 ${
      data.surface === "editor"
        ? editorLandingNodeToneClass[data.tone]
        : landingNodeToneClass[data.tone]
    } ${data.active ? "scale-[1.04]" : "opacity-75"}`}
  >
    <Handle
      type="target"
      position={Position.Left}
      className={`!h-2 !w-2 !border-0 ${
        data.surface === "editor" ? "!bg-stone-500/70" : "!bg-amber-700/70"
      }`}
    />
    <Handle
      type="source"
      position={Position.Right}
      className={`!h-2 !w-2 !border-0 ${
        data.surface === "editor" ? "!bg-stone-500/70" : "!bg-amber-700/70"
      }`}
    />
    <div className="mb-2 flex items-center justify-between gap-4">
      <span className="text-[9px] font-bold uppercase tracking-[0.18em] opacity-60">
        {data.eyebrow}
      </span>
      {data.index && (
        <span className="font-mono text-[10px] tabular-nums opacity-45">
          {data.index}
        </span>
      )}
    </div>
    <div className="font-serif text-xl font-bold leading-tight tracking-[-0.02em]">
      {data.title}
    </div>
    <p className="mt-2 max-w-[18ch] text-[11px] leading-relaxed opacity-65">
      {data.detail}
    </p>
    {data.active && data.pulse !== false && (
      <span className="pointer-events-none absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-600 shadow-[0_0_0_6px_rgba(217,119,6,0.16)]" />
    )}
  </div>
);

const landingFlowNodeTypes = {
  landingFlow: LandingFlowNode,
};

const heroFlowNodes: Node<LandingFlowNodeData>[] = [
  {
    id: "start",
    type: "landingFlow",
    position: { x: 0, y: 150 },
    sourcePosition: Position.Right,
    data: {
      eyebrow: "startNode",
      title: "Старт",
      detail: "Точка входа в сценарий",
      tone: "ink",
      surface: "editor",
      active: true,
      pulse: false,
      index: "01",
    },
  },
  {
    id: "info",
    type: "landingFlow",
    position: { x: 230, y: 42 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: {
      eyebrow: "infoNode",
      title: "Информация",
      detail: "Текст, медиа и кнопка далее",
      tone: "amber",
      surface: "editor",
      active: true,
      pulse: false,
      index: "02",
    },
  },
  {
    id: "question",
    type: "landingFlow",
    position: { x: 230, y: 246 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: {
      eyebrow: "questionNode",
      title: "Вопрос",
      detail: "Варианты ответа и ветки",
      tone: "rose",
      surface: "editor",
      active: true,
      pulse: false,
      index: "03",
    },
  },
  {
    id: "collect",
    type: "landingFlow",
    position: { x: 478, y: 48 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: {
      eyebrow: "collectInfoNode",
      title: "Сбор данных",
      detail: "Имя, контакты и поля формы",
      tone: "sage",
      surface: "editor",
      active: true,
      pulse: false,
      index: "04",
    },
  },
  {
    id: "result",
    type: "landingFlow",
    position: { x: 478, y: 238 },
    targetPosition: Position.Left,
    data: {
      eyebrow: "resultNode",
      title: "Финал",
      detail: "Результат, баллы и следующий шаг",
      tone: "ink",
      surface: "editor",
      active: true,
      pulse: false,
      index: "05",
    },
  },
];

const heroFlowEdges: Edge[] = [
  {
    id: "start-info",
    source: "start",
    target: "info",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#a8a29e", strokeWidth: 2.2 },
  },
  {
    id: "info-question",
    source: "info",
    target: "question",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#a8a29e", strokeWidth: 2.1 },
  },
  {
    id: "question-collect",
    source: "question",
    target: "collect",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#a8a29e", strokeWidth: 2.2 },
  },
  {
    id: "question-result",
    source: "question",
    target: "result",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#78716c", strokeWidth: 2.0 },
  },
];

const heroCanvasNodes: Node<LandingFlowNodeData>[] = [
  {
    ...heroFlowNodes[0],
    position: { x: 1210, y: 118 },
  },
  {
    ...heroFlowNodes[1],
    position: { x: 1190, y: 338 },
  },
  {
    ...heroFlowNodes[2],
    position: { x: 1120, y: 588 },
  },
  {
    ...heroFlowNodes[3],
    position: { x: 1458, y: 514 },
  },
  {
    ...heroFlowNodes[4],
    position: { x: 1458, y: 742 },
  },
];

const landingFlowProOptions = { hideAttribution: true };

interface LandingFlowSceneProps {
  className?: string;
  nodes?: Node<LandingFlowNodeData>[];
  edges?: Edge[];
  caption?: string;
  theme?: "paper" | "editor";
  interactive?: boolean;
}

const LandingFlowScene: React.FC<LandingFlowSceneProps> = ({
  className = "",
  nodes = heroFlowNodes,
  edges = heroFlowEdges,
  caption = "readonly flow",
  theme = "paper",
  interactive = true,
}) => {
  const sceneRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const el = sceneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--flow-x", `${x.toFixed(3)}`);
    el.style.setProperty("--flow-y", `${y.toFixed(3)}`);
  };

  const handlePointerLeave = () => {
    if (!interactive) return;
    const el = sceneRef.current;
    if (!el) return;
    el.style.setProperty("--flow-x", "0");
    el.style.setProperty("--flow-y", "0");
  };

  const isEditorTheme = theme === "editor";

  return (
    <div
      ref={sceneRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`landing-flow-scene group relative min-h-[430px] overflow-hidden ${
        isEditorTheme
          ? "bg-transparent"
          : "rounded-[2.4rem_0.9rem_2.4rem_0.9rem] border border-stone-900/10 bg-white/52 shadow-[0_34px_110px_rgba(68,64,60,0.12)] backdrop-blur"
      } ${className}`}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${
          isEditorTheme
            ? "bg-[radial-gradient(circle_at_22%_16%,rgba(255,255,255,0.9),transparent_36%),radial-gradient(circle_at_82%_78%,rgba(251,191,36,0.11),transparent_40%)]"
            : "bg-[radial-gradient(circle_at_22%_16%,rgba(251,191,36,0.25),transparent_34%),radial-gradient(circle_at_88%_74%,rgba(120,113,108,0.18),transparent_38%)]"
        }`}
      />
      <div
        className={`pointer-events-none absolute inset-0 ${
          isEditorTheme ? "opacity-[0.18]" : "opacity-[0.12]"
        }`}
        style={{
          backgroundImage:
            isEditorTheme
              ? undefined
              : "linear-gradient(rgba(68,64,60,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(68,64,60,0.16) 1px, transparent 1px)",
          backgroundSize: isEditorTheme ? "28px 28px" : "40px 40px",
          transform:
            interactive
              ? "translate3d(calc(var(--flow-x, 0) * -10px), calc(var(--flow-y, 0) * -10px), 0)"
              : undefined,
        }}
      />
      {!isEditorTheme && (
        <>
          <div
            className="pointer-events-none absolute -left-24 top-14 h-60 w-60 rounded-full bg-amber-300/28 blur-3xl transition-transform duration-500"
            style={{
              transform:
                "translate3d(calc(var(--flow-x, 0) * 34px), calc(var(--flow-y, 0) * 20px), 0)",
            }}
          />
          <div
            className="pointer-events-none absolute -right-20 bottom-8 h-72 w-72 rounded-full bg-stone-700/12 blur-3xl transition-transform duration-500"
            style={{
              transform:
                "translate3d(calc(var(--flow-x, 0) * -28px), calc(var(--flow-y, 0) * -22px), 0)",
            }}
          />
        </>
      )}

      <div className="relative h-[430px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={landingFlowNodeTypes}
          proOptions={landingFlowProOptions}
          fitView
          fitViewOptions={{ padding: isEditorTheme ? 0.16 : 0.18 }}
          nodesDraggable={interactive}
          nodesConnectable={false}
          elementsSelectable={interactive}
          panOnDrag={interactive}
          zoomOnScroll={interactive}
          zoomOnPinch={interactive}
          zoomOnDoubleClick={interactive}
          preventScrolling={false}
          className="landing-react-flow"
        >
          {!isEditorTheme && (
            <Background
              variant={BackgroundVariant.Lines}
              gap={30}
              size={1}
              color="rgba(68,64,60,0.14)"
            />
          )}
        </ReactFlow>
      </div>

      {caption && (
        <div className="pointer-events-none absolute left-6 top-6 flex items-center gap-3 rounded-full border border-stone-900/10 bg-white/80 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-600 shadow-sm backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-amber-600 shadow-[0_0_0_5px_rgba(217,119,6,0.12)]" />
          {caption}
        </div>
      )}
    </div>
  );
};

const HeroCanvasBackground: React.FC = () => {
  const [nodes, , onNodesChange] = useNodesState(heroCanvasNodes);

  return (
    <div className="absolute inset-0 z-[1]">
      <ReactFlow
        nodes={nodes}
        edges={heroFlowEdges}
        onNodesChange={onNodesChange}
        nodeTypes={landingFlowNodeTypes}
        proOptions={landingFlowProOptions}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick
        preventScrolling={false}
        className="landing-react-flow hero-react-flow"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(87,83,78,0.34)"
        />
      </ReactFlow>
    </div>
  );
};

// ============================================
// HOOKS
// ============================================
const scrollToSection = (id: string) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

export const LANDING_NAV_ITEMS = [
  { label: "Лучшие квизы", target: "templates" },
  { label: "Возможности", target: "features" },
  { label: "Лаборатория", target: "scenario-lab" },
  { label: "Об авторе", target: "author" },
  { label: "Тарифы", target: "pricing" },
] as const;

const useScrollProgress = () => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? window.scrollY / h : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return progress;
};

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
const shootConfetti = async () => {
  try {
    const confetti = (await import("canvas-confetti")).default;
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#fbbf24", "#f97316", "#ec4899", "#8b5cf6"],
    });
  } catch (e) {}
};

// ============================================
// HERO SECTION — Асимметричная композиция
// ============================================
const HeroSection = ({ onCTA }: { onCTA: () => void }) => {
  const scrollProgress = useScrollProgress();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[#f3f3ef]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_58%_at_16%_12%,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0.44)_42%,transparent_74%)]" />

        {/* Grain texture */}
        <div className="absolute inset-0 opacity-[0.09] bg-noise mix-blend-multiply" />
      </div>

      <HeroCanvasBackground />

      {/* Content - Асимметричный grid */}
      <div className="pointer-events-none container mx-auto px-6 pt-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-4 items-center min-h-[80vh]">
          {/* Left: Main content (7 cols - golden ratio) */}
          <div className="pt-10 lg:col-span-7 lg:pr-8">
            <Reveal disabled>
              <Label className="mb-9">No-code платформа сценариев</Label>
            </Reveal>

            <Reveal disabled>
              <Heading
                level={1}
                accent="сценарии без кода"
                className="mb-8 max-w-[49rem] text-stone-950"
              >
                Создавайте интерактивные
              </Heading>
            </Reveal>

            <Reveal disabled>
              <div className="mb-10 max-w-[35rem] space-y-4 text-[1.02rem] leading-[1.66] tracking-normal text-stone-700 md:text-[1.1rem] md:leading-[1.62]">
                <p className="font-normal text-stone-700">
                  <span className="font-semibold text-stone-950">Поток</span>{" "}
                  — no-code платформа для сценариев с ветвлениями, условиями и
                  персональными результатами. Подходит для уроков, квестов,
                  диагностик, тренажёров, лид-воронок и бизнес-опросников.
                </p>
                <p className="text-stone-600/95">
                  Собирайте логику на{" "}
                  <span className="font-semibold text-amber-800">
                    визуальной карте
                  </span>
                  : вопросы, формы, баллы, обратную связь и итоговые экраны —
                  без кода, таблиц и технической сборки.
                </p>
              </div>
            </Reveal>

            <Reveal disabled>
              <div className="pointer-events-auto flex flex-wrap items-center gap-4">
                <MagneticButton
                  onClick={onCTA}
                  className="group relative px-8 py-4 text-lg font-bold text-black bg-gradient-to-r from-amber-300 to-orange-400 rounded-full overflow-hidden transition-transform hover:scale-105"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Начать создавать
                  </span>
                </MagneticButton>

                <Link
                  to="/public"
                  className="group flex items-center gap-3 px-6 py-4 text-stone-600 hover:text-stone-950 transition-colors"
                >
                  <span className="w-10 h-10 rounded-full border border-stone-900/15 bg-white/50 flex items-center justify-center group-hover:border-amber-700/35 group-hover:bg-amber-100/70 transition-all">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </span>
                  <span className="font-medium">Посмотреть пример</span>
                </Link>
              </div>
            </Reveal>

            <Reveal disabled className="mt-14">
              <div className="flex max-w-[34rem] items-center gap-4 border-l border-stone-900/15 pl-5 text-[0.82rem] font-medium uppercase tracking-[0.16em] text-stone-500">
                <span>Обучение</span>
                <span className="h-px w-7 bg-stone-400/60" />
                <span>Бизнес</span>
                <span className="h-px w-7 bg-stone-400/60" />
                <span>Мероприятия</span>
              </div>
            </Reveal>
          </div>

          <div className="hidden lg:col-span-5 lg:block" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
};

// ============================================
// FEATURES — Карточки со "связями"
// ============================================
const features = [
  {
    id: "visual",
    icon: "VG",
    title: "Визуальный граф",
    description:
      "Создавайте сценарии как художник — соединяя узлы на холсте. Каждая связь — это путь ученика.",
    color: "from-stone-800 to-stone-950",
    shadowColor: "shadow-stone-900/15",
  },
  {
    id: "logic",
    icon: "IF",
    title: "Умная логика",
    description:
      "Условия, переменные, таймеры. Квиз адаптируется под каждого ученика индивидуально.",
    color: "from-amber-400 to-orange-500",
    shadowColor: "shadow-amber-500/20",
  },
  {
    id: "gamification",
    icon: "XP",
    title: "Геймификация",
    description:
      "Очки, достижения, инвентарь. Превратите обучение в приключение с наградами.",
    color: "from-rose-500 to-orange-500",
    shadowColor: "shadow-rose-700/15",
  },
  {
    id: "export",
    icon: "EX",
    title: "Один файл",
    description:
      "Экспорт в автономный HTML. Работает офлайн, без регистрации, без зависимостей.",
    color: "from-emerald-500 to-teal-600",
    shadowColor: "shadow-emerald-700/15",
  },
];

interface ScenarioLabMode {
  id: "client-brief" | "employee-training" | "service-fit" | "corporate-certification" | "product-selection" | "calculator";
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  caption: string;
  accent: string;
  nodes: Node<LandingFlowNodeData>[];
  edges: Edge[];
  stats: Array<{ label: string; value: string }>;
  checkpoints: string[];
}

const scenarioLabModes: ScenarioLabMode[] = [
  {
    id: "client-brief",
    label: "Бриф для клиента",
    eyebrow: "первичная диагностика",
    title: "Соберите точное ТЗ без длинных созвонов",
    description:
      "Клиент проходит понятный маршрут: отвечает на ключевые вопросы, прикладывает материалы, уточняет бюджет и получает аккуратное резюме запроса. Команда видит структурированный бриф, а не набор разрозненных сообщений.",
    caption: "сценарий: бриф",
    accent: "from-stone-700 to-amber-500",
    nodes: [
      { id: "brief-start", type: "landingFlow", position: { x: 10, y: 132 }, sourcePosition: Position.Right, data: { eyebrow: "старт", title: "Контекст", detail: "Цель проекта и роль клиента", tone: "ink", active: true, index: "01" } },
      { id: "brief-needs", type: "landingFlow", position: { x: 276, y: 44 }, sourcePosition: Position.Right, targetPosition: Position.Left, data: { eyebrow: "вопросы", title: "Задачи", detail: "Приоритеты, сроки и ограничения", tone: "amber", active: true, index: "02" } },
      { id: "brief-files", type: "landingFlow", position: { x: 286, y: 232 }, sourcePosition: Position.Right, targetPosition: Position.Left, data: { eyebrow: "форма", title: "Материалы", detail: "Ссылки, файлы и контакты", tone: "sage", active: true, index: "03" } },
      { id: "brief-summary", type: "landingFlow", position: { x: 548, y: 134 }, targetPosition: Position.Left, data: { eyebrow: "итог", title: "Резюме", detail: "Готовая заявка для команды", tone: "rose", active: true, index: "04" } },
    ],
    edges: [
      { id: "brief-1", source: "brief-start", target: "brief-needs", type: "smoothstep", animated: true, style: { stroke: "#78716c", strokeWidth: 2.2 } },
      { id: "brief-2", source: "brief-start", target: "brief-files", type: "smoothstep", animated: true, style: { stroke: "#b45309", strokeWidth: 2.4 } },
      { id: "brief-3", source: "brief-needs", target: "brief-summary", type: "smoothstep", animated: true, style: { stroke: "#b45309", strokeWidth: 2.4 } },
      { id: "brief-4", source: "brief-files", target: "brief-summary", type: "smoothstep", animated: true, style: { stroke: "#047857", strokeWidth: 2.1 } },
    ],
    stats: [{ label: "полей", value: "12" }, { label: "ветки", value: "3" }, { label: "минут", value: "7" }],
    checkpoints: ["Вопросы меняются под тип клиента и задачу", "Форма собирает контакты, материалы и ограничения", "Финал превращает ответы в понятное резюме для менеджера"],
  },
  {
    id: "employee-training",
    label: "Тренажёр сотрудника",
    eyebrow: "практика без риска",
    title: "Отработайте рабочие ситуации до выхода в поле",
    description:
      "Сотрудник проходит кейсы, принимает решения, получает обратную связь и видит последствия. Такой сценарий подходит для продаж, поддержки, сервиса, онбординга и регламентов.",
    caption: "сценарий: тренажёр",
    accent: "from-emerald-600 to-stone-700",
    nodes: [
      { id: "training-case", type: "landingFlow", position: { x: 8, y: 124 }, sourcePosition: Position.Right, data: { eyebrow: "кейс", title: "Ситуация", detail: "Клиент, задача и вводные", tone: "ink", active: true, index: "01" } },
      { id: "training-action", type: "landingFlow", position: { x: 268, y: 22 }, sourcePosition: Position.Right, targetPosition: Position.Left, data: { eyebrow: "выбор", title: "Действие", detail: "Как сотрудник ответит", tone: "sage", active: true, index: "02" } },
      { id: "training-condition", type: "landingFlow", position: { x: 278, y: 218 }, sourcePosition: Position.Right, targetPosition: Position.Left, data: { eyebrow: "условие", title: "Реакция", detail: "Ветка зависит от решения", tone: "amber", active: true, index: "03" } },
      { id: "training-feedback", type: "landingFlow", position: { x: 548, y: 132 }, targetPosition: Position.Left, data: { eyebrow: "разбор", title: "Фидбек", detail: "Баллы, ошибки и подсказки", tone: "rose", active: true, index: "04" } },
    ],
    edges: [
      { id: "training-1", source: "training-case", target: "training-action", type: "smoothstep", animated: true, style: { stroke: "#047857", strokeWidth: 2.2 } },
      { id: "training-2", source: "training-case", target: "training-condition", type: "smoothstep", animated: true, style: { stroke: "#78716c", strokeWidth: 2.1 } },
      { id: "training-3", source: "training-action", target: "training-feedback", type: "smoothstep", animated: true, style: { stroke: "#047857", strokeWidth: 2.3 } },
      { id: "training-4", source: "training-condition", target: "training-feedback", type: "smoothstep", animated: true, style: { stroke: "#be123c", strokeWidth: 2.1 } },
    ],
    stats: [{ label: "кейсов", value: "8" }, { label: "навыков", value: "5" }, { label: "попытки", value: "∞" }],
    checkpoints: ["Кейсы имитируют реальные разговоры и решения", "Баллы показывают качество ответа, а не только факт прохождения", "Финальный разбор помогает закрепить правильный алгоритм"],
  },
  {
    id: "service-fit",
    label: "Подбор услуги",
    eyebrow: "консультация на сайте",
    title: "Помогите клиенту выбрать подходящее решение",
    description:
      "Пользователь отвечает на несколько вопросов, а сценарий уточняет потребности, отсеивает неподходящие варианты и выводит персональную рекомендацию с аргументацией.",
    caption: "сценарий: услуга",
    accent: "from-amber-600 to-rose-500",
    nodes: [
      { id: "service-goal", type: "landingFlow", position: { x: 14, y: 126 }, sourcePosition: Position.Right, data: { eyebrow: "запрос", title: "Цель", detail: "Что клиент хочет решить", tone: "amber", active: true, index: "01" } },
      { id: "service-segment", type: "landingFlow", position: { x: 278, y: 34 }, sourcePosition: Position.Right, targetPosition: Position.Left, data: { eyebrow: "сегмент", title: "Профиль", detail: "Размер, опыт и бюджет", tone: "ink", active: true, index: "02" } },
      { id: "service-rule", type: "landingFlow", position: { x: 286, y: 226 }, sourcePosition: Position.Right, targetPosition: Position.Left, data: { eyebrow: "логика", title: "Фильтр", detail: "Условия убирают лишнее", tone: "sage", active: true, index: "03" } },
      { id: "service-result", type: "landingFlow", position: { x: 552, y: 132 }, targetPosition: Position.Left, data: { eyebrow: "итог", title: "Услуга", detail: "Рекомендация и следующий шаг", tone: "rose", active: true, index: "04" } },
    ],
    edges: [
      { id: "service-1", source: "service-goal", target: "service-segment", type: "smoothstep", animated: true, style: { stroke: "#b45309", strokeWidth: 2.4 } },
      { id: "service-2", source: "service-goal", target: "service-rule", type: "smoothstep", animated: true, style: { stroke: "#78716c", strokeWidth: 2.1 } },
      { id: "service-3", source: "service-segment", target: "service-result", type: "smoothstep", animated: true, style: { stroke: "#be123c", strokeWidth: 2.1 } },
      { id: "service-4", source: "service-rule", target: "service-result", type: "smoothstep", animated: true, style: { stroke: "#047857", strokeWidth: 2.1 } },
    ],
    stats: [{ label: "варианта", value: "6" }, { label: "условий", value: "14" }, { label: "лид", value: "1" }],
    checkpoints: ["Вопросы идут от простого запроса к точным ограничениям", "Условия показывают только релевантные услуги", "Финал объясняет, почему выбран именно этот вариант"],
  },
  {
    id: "corporate-certification",
    label: "Корпоративная аттестация",
    eyebrow: "проверка знаний",
    title: "Проведите аттестацию с понятными критериями",
    description:
      "Сценарий проверяет знания регламентов, считает баллы, фиксирует результат и даёт персональный итог. Подходит для внутреннего обучения, допуска к задачам и повторной проверки.",
    caption: "сценарий: аттестация",
    accent: "from-stone-800 to-emerald-600",
    nodes: [
      { id: "cert-role", type: "landingFlow", position: { x: 12, y: 126 }, sourcePosition: Position.Right, data: { eyebrow: "роль", title: "Профиль", detail: "Должность и блок проверки", tone: "ink", active: true, index: "01" } },
      { id: "cert-test", type: "landingFlow", position: { x: 276, y: 36 }, sourcePosition: Position.Right, targetPosition: Position.Left, data: { eyebrow: "тест", title: "Вопросы", detail: "Регламенты и кейсы", tone: "sage", active: true, index: "02" } },
      { id: "cert-score", type: "landingFlow", position: { x: 286, y: 226 }, sourcePosition: Position.Right, targetPosition: Position.Left, data: { eyebrow: "баллы", title: "Порог", detail: "Условия допуска и пересдачи", tone: "amber", active: true, index: "03" } },
      { id: "cert-report", type: "landingFlow", position: { x: 552, y: 132 }, targetPosition: Position.Left, data: { eyebrow: "отчёт", title: "Итог", detail: "Статус, ошибки и рекомендации", tone: "rose", active: true, index: "04" } },
    ],
    edges: [
      { id: "cert-1", source: "cert-role", target: "cert-test", type: "smoothstep", animated: true, style: { stroke: "#047857", strokeWidth: 2.2 } },
      { id: "cert-2", source: "cert-role", target: "cert-score", type: "smoothstep", animated: true, style: { stroke: "#78716c", strokeWidth: 2.1 } },
      { id: "cert-3", source: "cert-test", target: "cert-report", type: "smoothstep", animated: true, style: { stroke: "#047857", strokeWidth: 2.3 } },
      { id: "cert-4", source: "cert-score", target: "cert-report", type: "smoothstep", animated: true, style: { stroke: "#b45309", strokeWidth: 2.2 } },
    ],
    stats: [{ label: "порог", value: "80%" }, { label: "блоков", value: "4" }, { label: "отчёт", value: "PDF" }],
    checkpoints: ["Вопросы можно разделить по ролям и компетенциям", "Баллы и условия автоматически определяют итоговый статус", "Результат удобно передать руководителю или HR-команде"],
  },
  {
    id: "product-selection",
    label: "Сложный подбор продукта",
    eyebrow: "конфигуратор решения",
    title: "Проведите клиента через сложную продуктовую матрицу",
    description:
      "Когда вариантов много, сценарий помогает уточнить ограничения, совместимость и приоритеты. На выходе клиент получает короткий список продуктов вместо перегруженного каталога.",
    caption: "сценарий: продукт",
    accent: "from-rose-500 to-stone-800",
    nodes: [
      { id: "product-need", type: "landingFlow", position: { x: 12, y: 132 }, sourcePosition: Position.Right, data: { eyebrow: "потребность", title: "Задача", detail: "Что должно измениться", tone: "rose", active: true, index: "01" } },
      { id: "product-limits", type: "landingFlow", position: { x: 278, y: 40 }, sourcePosition: Position.Right, targetPosition: Position.Left, data: { eyebrow: "ограничения", title: "Параметры", detail: "Цена, сроки, совместимость", tone: "ink", active: true, index: "02" } },
      { id: "product-branch", type: "landingFlow", position: { x: 286, y: 232 }, sourcePosition: Position.Right, targetPosition: Position.Left, data: { eyebrow: "ветки", title: "Матрица", detail: "Правила исключают лишнее", tone: "amber", active: true, index: "03" } },
      { id: "product-shortlist", type: "landingFlow", position: { x: 552, y: 132 }, targetPosition: Position.Left, data: { eyebrow: "выбор", title: "Shortlist", detail: "2-3 продукта с пояснением", tone: "sage", active: true, index: "04" } },
    ],
    edges: [
      { id: "product-1", source: "product-need", target: "product-limits", type: "smoothstep", animated: true, style: { stroke: "#be123c", strokeWidth: 2.2 } },
      { id: "product-2", source: "product-need", target: "product-branch", type: "smoothstep", animated: true, style: { stroke: "#78716c", strokeWidth: 2.1 } },
      { id: "product-3", source: "product-limits", target: "product-shortlist", type: "smoothstep", animated: true, style: { stroke: "#b45309", strokeWidth: 2.4 } },
      { id: "product-4", source: "product-branch", target: "product-shortlist", type: "smoothstep", animated: true, style: { stroke: "#047857", strokeWidth: 2.1 } },
    ],
    stats: [{ label: "SKU", value: "40+" }, { label: "правил", value: "18" }, { label: "итога", value: "3" }],
    checkpoints: ["Сценарий удерживает клиента от выбора неподходящего продукта", "Правила учитывают совместимость, бюджет и сценарий использования", "Финал даёт не один ответ, а аргументированный shortlist"],
  },
  {
    id: "calculator",
    label: "Калькулятор",
    eyebrow: "расчёт стоимости",
    title: "Покажите цену, выгоду или результат прямо в сценарии",
    description:
      "Калькулятор собирает параметры, применяет формулы, показывает диапазон и предлагает следующий шаг. Подходит для стоимости проекта, экономии, окупаемости, рейтинга или персонального результата.",
    caption: "сценарий: калькулятор",
    accent: "from-amber-500 to-stone-700",
    nodes: [
      { id: "calc-input", type: "landingFlow", position: { x: 10, y: 132 }, sourcePosition: Position.Right, data: { eyebrow: "данные", title: "Параметры", detail: "Объём, сроки и вводные", tone: "amber", active: true, index: "01" } },
      { id: "calc-formula", type: "landingFlow", position: { x: 276, y: 44 }, sourcePosition: Position.Right, targetPosition: Position.Left, data: { eyebrow: "формула", title: "Расчёт", detail: "Баллы, множители и условия", tone: "ink", active: true, index: "02" } },
      { id: "calc-range", type: "landingFlow", position: { x: 286, y: 232 }, sourcePosition: Position.Right, targetPosition: Position.Left, data: { eyebrow: "диапазон", title: "Вилка", detail: "Минимум, максимум и пояснение", tone: "sage", active: true, index: "03" } },
      { id: "calc-result", type: "landingFlow", position: { x: 548, y: 134 }, targetPosition: Position.Left, data: { eyebrow: "итог", title: "Результат", detail: "Цена, выгода и CTA", tone: "rose", active: true, index: "04" } },
    ],
    edges: [
      { id: "calc-1", source: "calc-input", target: "calc-formula", type: "smoothstep", animated: true, style: { stroke: "#b45309", strokeWidth: 2.4 } },
      { id: "calc-2", source: "calc-input", target: "calc-range", type: "smoothstep", animated: true, style: { stroke: "#78716c", strokeWidth: 2.1 } },
      { id: "calc-3", source: "calc-formula", target: "calc-result", type: "smoothstep", animated: true, style: { stroke: "#b45309", strokeWidth: 2.4 } },
      { id: "calc-4", source: "calc-range", target: "calc-result", type: "smoothstep", animated: true, style: { stroke: "#047857", strokeWidth: 2.1 } },
    ],
    stats: [{ label: "полей", value: "7" }, { label: "формулы", value: "3" }, { label: "CTA", value: "1" }],
    checkpoints: ["Вводные собираются через понятные вопросы и формы", "Формулы учитывают коэффициенты, пороги и условия", "Финал показывает результат и предлагает следующий шаг"],
  },
];

const FeaturesSection = () => {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  return (
    <section id="features" className="scroll-mt-24 py-24 lg:py-32 relative">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(68,64,60,0.22) 1px, transparent 0)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="container mx-auto px-6 relative">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <Reveal>
            <Label className="justify-center mb-6">Возможности</Label>
          </Reveal>
          <Reveal delay={100}>
            <Heading level={2} className="text-stone-950 mb-6">
              Всё что нужно для
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-700 to-rose-700 italic">
                интерактивного обучения
              </span>
            </Heading>
          </Reveal>
        </div>

        {/* Features grid с визуальными связями */}
        <div className="relative max-w-5xl mx-auto">
          {/* Connecting lines between cards */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none hidden lg:block"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                id="connect-grad"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="rgba(180,83,9,0.28)" />
                <stop offset="100%" stopColor="rgba(87,83,78,0.24)" />
              </linearGradient>
            </defs>
            {/* Horizontal line */}
            <line
              x1="25"
              y1="50"
              x2="75"
              y2="50"
              stroke="url(#connect-grad)"
              strokeWidth="0.2"
              strokeDasharray="1 1"
            />
            {/* Vertical line */}
            <line
              x1="50"
              y1="25"
              x2="50"
              y2="75"
              stroke="url(#connect-grad)"
              strokeWidth="0.2"
              strokeDasharray="1 1"
            />
          </svg>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <Reveal key={feature.id} delay={i * 100}>
                <div
                  className={`group relative p-8 rounded-3xl border transition-all duration-500 cursor-pointer ${
                    activeFeature === feature.id
                      ? "bg-white/70 border-amber-800/20 scale-[1.02] shadow-[0_24px_70px_rgba(68,64,60,0.1)]"
                      : "bg-white/38 border-stone-900/[0.08] hover:border-amber-800/18 hover:bg-white/65"
                  }`}
                  onMouseEnter={() => setActiveFeature(feature.id)}
                  onMouseLeave={() => setActiveFeature(null)}
                >
                  {/* Corner nodes */}
                  <FlowNode
                    size="sm"
                    active={activeFeature === feature.id}
                    className="absolute -top-1 -left-1"
                  />
                  <FlowNode
                    size="sm"
                    active={activeFeature === feature.id}
                    className="absolute -top-1 -right-1"
                  />
                  <FlowNode
                    size="sm"
                    active={activeFeature === feature.id}
                    className="absolute -bottom-1 -left-1"
                  />
                  <FlowNode
                    size="sm"
                    active={activeFeature === feature.id}
                    className="absolute -bottom-1 -right-1"
                  />

                  <div className="flex items-start gap-5">
                    <div
                      className={`shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} ${feature.shadowColor} shadow-lg flex items-center justify-center font-mono text-sm font-black tracking-[-0.08em] text-amber-50 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}
                    >
                      {feature.icon}
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-stone-950 mb-2 group-hover:text-amber-800 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-stone-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>

                  {/* Hover glow */}
                  <div
                    className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none`}
                  />
                </div>
              </Reveal>
            ))}
          </div>

          {/* Center node */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:block">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shadow-xl shadow-amber-700/20">
                <span className="font-serif text-2xl font-bold text-stone-950">
                  П
                </span>
              </div>
              <div className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-20" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ScenarioLabSection = () => {
  const [activeModeId, setActiveModeId] =
    useState<ScenarioLabMode["id"]>("client-brief");
  const activeMode =
    scenarioLabModes.find((mode) => mode.id === activeModeId) ??
    scenarioLabModes[0];

  return (
    <section
      id="scenario-lab"
      className="scroll-mt-24 py-24 lg:py-32 relative overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-x-0 top-12 mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-amber-800/20 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/36 blur-3xl" />
      <div className="container relative mx-auto px-6">
        <div className="mb-12 grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
          <Reveal>
            <div>
              <Label className="mb-6">Лаборатория сценариев</Label>
              <Heading level={2} className="text-stone-950">
                Соберите сценарий
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-700 to-rose-700 italic">
                  под реальную задачу
                </span>
              </Heading>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <p className="max-w-2xl text-lg leading-relaxed text-stone-600 lg:ml-auto">
              Шесть прикладных сценариев показывают, как одна визуальная карта закрывает обучение, продажи, диагностику и подбор решений. Переключайте режимы и смотрите, как меняются ноды, условия и финальный результат.
            </p>
          </Reveal>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Reveal className="space-y-3">
            {scenarioLabModes.map((mode) => {
              const isActive = mode.id === activeMode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setActiveModeId(mode.id)}
                  aria-pressed={isActive}
                  className={`group w-full overflow-hidden rounded-[1.6rem_0.7rem_1.6rem_0.7rem] border p-5 text-left transition-all duration-500 ${
                    isActive
                      ? "border-stone-950/15 bg-stone-950 text-amber-50 shadow-[0_24px_70px_rgba(28,25,23,0.18)]"
                      : "border-stone-900/10 bg-white/52 text-stone-950 hover:border-amber-800/22 hover:bg-white/75"
                  }`}
                >
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <div
                        className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                          isActive ? "text-amber-200/64" : "text-amber-800/60"
                        }`}
                      >
                        {mode.eyebrow}
                      </div>
                      <div className="mt-2 font-serif text-2xl font-bold leading-tight">
                        {mode.label}
                      </div>
                    </div>
                    <span
                      className={`mt-1 h-2.5 w-2.5 rounded-full transition-all duration-500 ${
                        isActive
                          ? "bg-amber-300 shadow-[0_0_0_7px_rgba(252,211,77,0.12)]"
                          : "bg-stone-900/18 group-hover:bg-amber-700"
                      }`}
                    />
                  </div>
                  <div
                    className={`mt-5 h-1.5 rounded-full bg-gradient-to-r ${mode.accent} transition-all duration-500 ${
                      isActive
                        ? "w-full opacity-100"
                        : "w-12 opacity-35 group-hover:w-24"
                    }`}
                  />
                </button>
              );
            })}
          </Reveal>

          <Reveal delay={140} direction="left">
            <div className="relative overflow-hidden rounded-[2.8rem_0.95rem_2.8rem_0.95rem] border border-stone-900/10 bg-white/46 p-4 shadow-[0_34px_120px_rgba(68,64,60,0.11)] backdrop-blur">
              <div className="absolute right-8 top-8 z-10 hidden rounded-full border border-stone-900/10 bg-white/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 backdrop-blur md:block">
                live pattern
              </div>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <LandingFlowScene
                  key={activeMode.id}
                  nodes={activeMode.nodes}
                  edges={activeMode.edges}
                  caption={activeMode.caption}
                  className="min-h-[470px]"
                />

                <div className="relative overflow-hidden rounded-[2rem_0.75rem_2rem_0.75rem] border border-stone-900/10 bg-[#f8f7f2]/82 p-6">
                  <div
                    className={`absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br ${activeMode.accent} opacity-20 blur-2xl`}
                  />
                  <div className="relative">
                    <div className="mb-5 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-800/60">
                      выбранный сценарий
                    </div>
                    <h3 className="font-serif text-3xl font-bold leading-[1.05] tracking-[-0.03em] text-stone-950">
                      {activeMode.title}
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed text-stone-600">
                      {activeMode.description}
                    </p>

                    <div className="mt-7 grid grid-cols-3 gap-2">
                      {activeMode.stats.map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-2xl border border-stone-900/10 bg-white/62 p-3 text-center"
                        >
                          <div className="font-serif text-2xl font-bold text-stone-950">
                            {stat.value}
                          </div>
                          <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-stone-500">
                            {stat.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-7 space-y-3">
                      {activeMode.checkpoints.map((checkpoint, index) => (
                        <div
                          key={checkpoint}
                          className="flex gap-3 text-sm leading-relaxed text-stone-600"
                        >
                          <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-950 font-mono text-[9px] text-amber-100">
                            {index + 1}
                          </span>
                          <span>{checkpoint}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

// ============================================
// HOW IT WORKS — Timeline с flow-линиями
// ============================================
const steps = [
  {
    num: "01",
    title: "Создайте узлы",
    desc: "Каждый узел — экран квиза: вопрос, информация, развилка.",
  },
  {
    num: "02",
    title: "Соедините связями",
    desc: "Протяните линии между узлами, создавая путь ученика.",
  },
  {
    num: "03",
    title: "Добавьте логику",
    desc: "Условия, переменные, таймеры — квиз становится умным.",
  },
  {
    num: "04",
    title: "Опубликуйте",
    desc: "Один клик — и квиз готов. Делитесь ссылкой или файлом.",
  },
];

const HowItWorksSection = () => {
  const [activeStep, setActiveStep] = useState(0);
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);
  const stepTones: LandingNodeTone[] = ["ink", "amber", "rose", "sage"];
  const storyNodes = useMemo<Node<LandingFlowNodeData>[]>(
    () =>
      steps.map((step, index) => ({
        id: step.num,
        type: "landingFlow",
        position: [
          { x: 18, y: 98 },
          { x: 276, y: 36 },
          { x: 286, y: 232 },
          { x: 548, y: 134 },
        ][index],
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          eyebrow:
            index === 0
              ? "идея"
              : index === 1
                ? "связь"
                : index === 2
                  ? "правило"
                  : "публикация",
          title: step.title,
          detail: step.desc,
          tone: stepTones[index] ?? "amber",
          active: activeStep >= index,
          index: step.num,
        },
      })),
    [activeStep],
  );
  const storyEdges = useMemo<Edge[]>(
    () =>
      [
        ["01", "02", 0],
        ["02", "03", 1],
        ["03", "04", 2],
        ["01", "03", 1],
      ].map(([source, target, gate]) => {
        const isActive = activeStep > Number(gate);
        return {
          id: `story-${source}-${target}`,
          source: String(source),
          target: String(target),
          type: "smoothstep",
          animated: isActive,
          style: {
            stroke: isActive ? "#b45309" : "#d6d3d1",
            strokeWidth: isActive ? 2.6 : 1.6,
          },
        };
      }),
    [activeStep],
  );

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = stepsRef.current.indexOf(e.target as HTMLDivElement);
            if (idx !== -1) setActiveStep(idx);
          }
        });
      },
      { rootMargin: "-30% 0px -30% 0px" },
    );

    stepsRef.current.forEach((ref) => ref && obs.observe(ref));
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="how"
      className="scroll-mt-24 py-24 lg:py-32 relative overflow-hidden bg-gradient-to-b from-transparent via-white/42 to-transparent"
    >
      <div className="pointer-events-none absolute left-[-10%] top-20 h-[28rem] w-[28rem] rounded-full bg-stone-300/18 blur-3xl" />
      <div className="pointer-events-none absolute right-[-12%] bottom-16 h-[30rem] w-[30rem] rounded-full bg-stone-700/10 blur-3xl" />
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <Reveal>
            <Label className="justify-center mb-6">Как это работает</Label>
          </Reveal>
          <Reveal delay={100}>
            <Heading level={2} className="text-stone-950">
              От идеи до публикации
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-stone-900 to-amber-700 italic">
                за 4 простых шага
              </span>
            </Heading>
          </Reveal>
        </div>

        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.04fr_0.96fr] lg:items-start">
          <Reveal className="lg:sticky lg:top-28">
            <LandingFlowScene
              nodes={storyNodes}
              edges={storyEdges}
              caption={`шаг ${activeStep + 1} / ${steps.length}`}
              className="lg:translate-y-6"
            />
            <div className="mt-6 rounded-[1.6rem_0.7rem_1.6rem_0.7rem] border border-stone-900/10 bg-white/56 p-5 shadow-[0_18px_60px_rgba(68,64,60,0.08)] backdrop-blur">
              <div className="flex items-center justify-between gap-5">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-800/60">
                    текущий этап
                  </div>
                  <div className="mt-1 font-serif text-2xl font-bold text-stone-950">
                    {steps[activeStep].title}
                  </div>
                </div>
                <div className="font-mono text-4xl font-semibold text-stone-900/12">
                  {steps[activeStep].num}
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">
                Граф не украшает страницу, а объясняет механику: каждый шаг
                добавляет новый слой сценария.
              </p>
            </div>
          </Reveal>

          <div className="space-y-6">
            {steps.map((step, i) => (
              <div
                key={step.num}
                ref={(el) => {
                  stepsRef.current[i] = el;
                }}
                className={`group relative overflow-hidden rounded-[2.25rem_0.8rem_2.25rem_0.8rem] border p-7 shadow-[0_18px_70px_rgba(68,64,60,0.08)] transition-all duration-500 ${
                  activeStep === i
                    ? "border-stone-950/15 bg-stone-950 text-amber-50 shadow-stone-950/16"
                    : activeStep > i
                      ? "border-amber-800/18 bg-white/70 text-stone-950"
                      : "border-stone-900/10 bg-white/46 text-stone-950 opacity-72"
                }`}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(120,113,108,0.14),transparent_34%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative flex items-start gap-6">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border font-mono text-sm font-bold transition-all duration-500 ${
                      activeStep === i
                        ? "border-amber-300/25 bg-amber-300 text-stone-950"
                        : "border-stone-900/10 bg-white/65 text-amber-800"
                    }`}
                  >
                    {step.num}
                  </div>
                  <div>
                    <h3
                      className={`font-serif text-2xl font-bold leading-tight tracking-[-0.02em] md:text-3xl ${
                        activeStep === i ? "text-amber-50" : "text-stone-950"
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p
                      className={`mt-3 max-w-xl text-lg leading-relaxed ${
                        activeStep === i ? "text-amber-50/64" : "text-stone-600"
                      }`}
                    >
                      {step.desc}
                    </p>
                    <div className="mt-6 flex items-center gap-3">
                      <span
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          activeStep >= i
                            ? "w-16 bg-amber-600"
                            : "w-7 bg-stone-900/14"
                        }`}
                      />
                      <span
                        className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                          activeStep === i
                            ? "text-amber-100/60"
                            : "text-stone-500"
                        }`}
                      >
                        {i === 0
                          ? "node"
                          : i === 1
                            ? "edge"
                            : i === 2
                              ? "logic"
                              : "share"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export function getFeaturedQuizDescription(quiz: PublicQuiz): string {
  const directDescription = quiz.quiz_data?.description?.trim();
  if (directDescription) return directDescription;

  const passportDescription =
    quiz.quiz_data?.passport?.scenarioDescription?.trim();
  if (passportDescription) return passportDescription;

  const nodes = quiz.quiz_data?.nodes ?? [];
  for (const node of nodes) {
    const data = node?.data;
    const candidate = [data?.description, data?.question, data?.message].find(
      (value) => typeof value === "string" && value.trim().length > 0,
    );
    if (candidate) return candidate.trim();
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

  const nodeById = new Map(
    allNodes.map((node: any) => [String(node.id), node]),
  );
  const outgoing = new Map<string, any[]>();
  for (const edge of allEdges) {
    const source = String(edge.source);
    outgoing.set(source, [...(outgoing.get(source) ?? []), edge]);
  }

  const startNode =
    allNodes.find((node: any) => node.type === "startNode") ?? allNodes[0];
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
      (edge: any) =>
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
  return (quiz.quiz_data?.nodes ?? [])
    .slice(0, limit)
    .map((node: any, index: number) => {
      const data = node?.data ?? {};
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

      return {
        id: String(node?.id ?? index),
        type: String(node?.type ?? "infoNode"),
        typeLabel: FEATURED_NODE_TYPE_LABELS[node?.type] || "Этап",
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
          setFeaturedQuizzes(data.filter((quiz) => quiz.is_favorite).slice(0, 8) as PublicQuiz[]);
        }
      } catch (error) {
        console.warn("Failed to load featured quizzes:", error);
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

    void buildPreview();
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
                          <FlowNode size="sm" active />
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

            <div className="pointer-events-none absolute -left-[5px] top-1/2 z-30 -translate-y-1/2">
              <FlowNode size="sm" active />
            </div>
            <div className="pointer-events-none absolute -right-[5px] top-1/3 z-30">
              <FlowNode size="sm" active />
            </div>
            <div className="pointer-events-none absolute bottom-[-5px] left-1/3 z-30">
              <FlowNode size="sm" />
            </div>

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
const AuthorSection = () => (
  <section
    id="author"
    className="scroll-mt-24 py-24 lg:py-32 relative overflow-hidden"
  >
    {/* Background accent */}
    <div className="absolute inset-0 bg-gradient-to-br from-amber-200/35 via-transparent to-stone-300/25" />

    <div className="container mx-auto px-6 relative">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Photo */}
          <Reveal className="lg:col-span-5" direction="right">
            <div className="relative">
              {/* Decorative frame */}
              <div className="absolute -inset-4 border border-amber-800/18 rounded-3xl" />
              <div className="absolute -inset-8 border border-stone-900/7 rounded-[2rem]" />

              {/* Photo */}
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
                <img
                  src="https://i.postimg.cc/bJZfTDWv/b-900-600-0-10-images-stories-2023-12-04-12-12.jpg"
                  alt="Евгений Некрытый"
                  loading="lazy"
                  className="w-full h-full object-cover saturate-[0.82] sepia-[0.08] hover:saturate-100 transition-all duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                {/* Name overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="font-serif text-2xl text-white font-bold">
                    Евгений Некрытый
                  </div>
                  <div className="text-amber-400/80 text-sm">
                    Создатель проекта
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 px-4 py-2 rounded-full bg-amber-500 text-black text-sm font-bold shadow-lg shadow-amber-500/30 animate-float">
                👋 Привет!
              </div>
            </div>
          </Reveal>

          {/* Quote */}
          <Reveal className="lg:col-span-7" direction="left" delay={150}>
            <div>
              <Label className="mb-8">Слово автора</Label>

              {/* Quote marks */}
              <div className="text-8xl font-serif text-amber-500/20 leading-none mb-4">
                "
              </div>

              <blockquote className="text-2xl md:text-3xl lg:text-4xl font-serif text-stone-950 leading-[1.3] -mt-12 mb-8">
                Я создал этот инструмент, потому что
                <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-amber-700 to-rose-700">
                  {" "}
                  устал от скучных тестов
                </span>
                . Обучение должно быть приключением.
              </blockquote>

              <p className="text-stone-600 text-lg leading-relaxed mb-8">
                Как преподаватель истории, я искал способ погрузить учеников в
                контекст эпохи, заставить их принимать решения как реальные
                исторические личности. Так родился «Поток» — конструктор,
                который уважает интеллект учителя и любопытство ученика.
              </p>

              {/* Signature */}
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 max-w-[100px] bg-gradient-to-r from-amber-500/50 to-transparent" />
                <span className="font-serif italic text-stone-600">
                  Евгений
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  </section>
);

// ============================================
// FINAL CTA — Мощный финал
// ============================================
const FinalCTA = ({ onCTA }: { onCTA: () => void }) => (
  <section className="py-32 relative overflow-hidden">
    {/* Background effects */}
    <div className="absolute inset-0">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full bg-gradient-to-t from-amber-400/18 via-rose-400/8 to-transparent blur-3xl" />
    </div>

    {/* Flow lines decoration */}
    <div className="absolute top-1/3 left-0 right-0 opacity-20">
      <FlowLine variant={3} />
    </div>

    <div className="container mx-auto px-6 text-center relative z-10">
      <Reveal>
        <Label className="justify-center mb-8">Присоединяйтесь</Label>
      </Reveal>

      <Reveal delay={100}>
        <Heading
          level={1}
          accent="прямо сейчас"
          className="text-stone-950 mb-8"
        >
          Начните творить
        </Heading>
      </Reveal>

      <Reveal delay={200}>
        <p className="text-xl text-stone-600 mb-12 max-w-xl mx-auto">
          Присоединяйтесь к{" "}
          <span className="text-stone-950 font-semibold">10,000+</span>{" "}
          новаторам в образовании. Бесплатно и без ограничений.
        </p>
      </Reveal>

      <Reveal delay={300}>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
          <MagneticButton
            onClick={onCTA}
            className="group rounded-full bg-stone-950 px-8 py-5 text-lg font-bold text-amber-50 transition-colors hover:bg-stone-800
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
          >
            <span className="flex items-center gap-3">
              Создать аккаунт
              <svg
                className="w-5 h-5 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </span>
          </MagneticButton>

          <Link
            to="/public"
            className="px-8 py-5 text-lg text-stone-600 hover:text-stone-950 transition-colors flex items-center gap-2"
          >
            Посмотреть примеры
            <span className="text-2xl">→</span>
          </Link>
        </div>
      </Reveal>

      {/* Trust badges */}
      <Reveal delay={500} className="mt-16">
        <div className="flex flex-wrap items-center justify-center gap-8 text-stone-500">
          {[
            { icon: "✓", text: "Бесплатный план" },
            { icon: "✓", text: "Без карты" },
            { icon: "✓", text: "Настройка за 2 мин" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-emerald-500">{item.icon}</span>
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  </section>
);

// ============================================
// FOOTER
// ============================================
const Footer: React.FC = () => {
  const nav = useAppNavigation();
  return (
    <footer className="border-t border-stone-900/10 bg-[#f8f7f2]/86 pt-16 pb-8">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black font-serif font-bold text-lg">
                П
              </div>
              <span className="text-xl font-bold text-stone-950">Поток</span>
            </div>
            <p className="text-stone-600 text-sm leading-relaxed">
              Конструктор интерактивных историй для современного образования.
            </p>
          </div>

          {[
            {
              title: "Продукт",
              links: [
                {
                  label: "Возможности",
                  onClick: () => scrollToSection("features"),
                },
                {
                  label: "Лучшие квизы",
                  onClick: () => scrollToSection("templates"),
                },
                { label: "Тарифы", onClick: () => scrollToSection("pricing") },
                {
                  label: "Галерея",
                  onClick: () => {
                    nav.goToPublicGallery();
                  },
                },
              ],
            },
            {
              title: "Ресурсы",
              links: [
                {
                  label: "Документация",
                  onClick: () => {
                    nav.goToDocs();
                  },
                },
              ],
            },
          ].map((section) => (
            <div key={section.title}>
              <h4 className="font-bold text-stone-950 text-sm mb-4 uppercase tracking-wider">
                {section.title}
              </h4>
              <ul className="space-y-3 text-stone-600 text-sm">
                {section.links.map((item) => (
                  <li key={item.label}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        item.onClick();
                      }}
                      className="hover:text-amber-800 transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider with flow line */}
        <div className="relative py-4">
          <FlowLine variant={1} className="opacity-30" />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-stone-500">
          <p>© 2024 Поток. Сделано для образования.</p>
          <div className="flex gap-6">
            <span className="text-stone-400">Конфиденциальность</span>
            <span className="text-stone-400">Условия</span>
          </div>
        </div>
        <div
          className="mt-6 flex flex-col items-center gap-2 border-t border-stone-900/10 pt-6 text-center text-xs leading-relaxed text-stone-500
                            md:flex-row md:flex-wrap md:justify-center md:gap-x-6"
        >
          <span className="font-semibold text-stone-700">
            Некрытый Евгений Владимирович
          </span>
          <span>ИНН 560993778885</span>
          <a
            href="mailto:mykviz@yandex.ru"
            className="text-amber-800/70 transition-colors hover:text-amber-800
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
          >
            mykviz@yandex.ru
          </a>
        </div>
      </div>
    </footer>
  );
};

// ============================================
// HEADER
// ============================================
const Header = ({ isScrolled }: { isScrolled: boolean }) => {
  const session = useAuthStore((s) => s.session);
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? "py-3" : "py-5"}`}
    >
      <div
        className={`absolute inset-0 transition-all duration-500 ${
          isScrolled
            ? "bg-[#f8f7f2]/88 backdrop-blur-xl border-b border-stone-900/10 shadow-[0_14px_45px_rgba(68,64,60,0.08)]"
            : ""
        }`}
      />

      <div className="container mx-auto px-6 relative z-10 flex justify-between items-center">
        {/* Logo */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="flex items-center gap-3 group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black font-serif font-bold shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
            П
          </div>
          <span className="text-lg font-bold text-stone-950">Поток</span>
        </a>

        {/* Nav */}
        <nav
          className="hidden lg:flex items-center gap-5 xl:gap-8"
          aria-label="Навигация по главной странице"
        >
          {LANDING_NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={`#${item.target}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection(item.target);
              }}
              className="text-sm text-stone-600 hover:text-stone-950 transition-colors relative group"
            >
              {item.label}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-amber-400 group-hover:w-full transition-all duration-300" />
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-4">
          <Link
            to="/public"
            className="hidden sm:block text-sm text-stone-600 hover:text-stone-950 transition-colors"
          >
            Галерея
          </Link>
          {session ? (
            <>
              <Link
                to="/editor"
                className="px-5 py-2.5 text-sm font-bold text-black bg-gradient-to-r from-amber-300 to-orange-400 hover:from-amber-200 hover:to-orange-300 rounded-full transition-all shadow-lg shadow-amber-500/20"
              >
                Создать квиз
              </Link>
              <Link
                to="/dashboard"
                className="px-5 py-2.5 text-sm font-bold bg-stone-950 text-white rounded-full hover:bg-stone-800 transition-colors shadow-lg shadow-stone-950/20"
              >
                Личный кабинет
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
};

// ============================================
// MAIN PAGE
// ============================================
const LandingPage: React.FC = () => {
  const isAuthModalOpen = useUIStore((s) => s.isAuthModalOpen);
  const setAuthModalOpen = useUIStore((s) => s.setAuthModalOpen);
  const nav = useAppNavigation();
  const scrollProgress = useScrollProgress();
  const isScrolled = scrollProgress > 0.02;
  const [pendingQuizId, setPendingQuizId] = useState<string | null>(null);

  const handleCTA = async () => {
    await shootConfetti();
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
    <div className="min-h-screen bg-[#f3f3ef] text-stone-950 overflow-x-hidden flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-[60] bg-stone-900/10">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-150"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      <Header isScrolled={isScrolled} />

      <main className="flex-1">
        <HeroSection onCTA={handleCTA} />
        <TemplateGallery onRequireAuthForQuiz={handleRequireAuthForQuiz} />
        <FeaturesSection />
        <ScenarioLabSection />
        <HowItWorksSection />
        <AuthorSection />
        <LandingPricingSection />
        <FinalCTA onCTA={handleCTA} />
      </main>

      <Footer />

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
