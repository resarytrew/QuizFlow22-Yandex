import { useCallback, useEffect, useRef, useState } from "react";
import {
  LazyMotion,
  domAnimation,
  m,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import ReactFlow, {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  type ReactFlowInstance,
} from "reactflow";
import StartNode from "../customNodes/StartNode";
import QuestionNode from "../customNodes/QuestionNode";
import ResultNode from "../customNodes/ResultNode";
import { CustomNodeType } from "../../types";
import {
  MOUNTAINS,
  nextStoryNode,
  storyEdges,
  storyNodes,
  storyQuestion,
  storyResult,
} from "./storyData";
import "./flow-story.css";

const nodeTypes = {
  [CustomNodeType.Start]: StartNode,
  [CustomNodeType.Question]: QuestionNode,
  [CustomNodeType.Result]: ResultNode,
};
const chapters = ["Идея", "Развилки", "Результат"];

function useCompactLayout() {
  const [compact, setCompact] = useState(
    () =>
      window.matchMedia("(max-width: 900px), (prefers-reduced-motion: reduce)")
        .matches,
  );
  useEffect(() => {
    const query = window.matchMedia(
      "(max-width: 900px), (prefers-reduced-motion: reduce)",
    );
    const update = () => setCompact(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return compact;
}

function StoryPlayer({ onCTA }: { onCTA: () => void }) {
  const [current, setCurrent] = useState("holiday");
  const heading = useRef<HTMLHeadingElement>(null);
  const isResult =
    storyNodes.find((node) => node.id === current)?.type ===
    CustomNodeType.Result;
  const choose = (id: string) => {
    const next = nextStoryNode(current, id);
    if (next) setCurrent(next);
    requestAnimationFrame(() =>
      heading.current?.focus({ preventScroll: true }),
    );
  };
  const result = storyResult(current);
  const question = storyQuestion(current);
  return (
    <div className="story-player" data-testid="story-player">
      <div className="story-player-bar">
        <span>Подбор путешествия</span>
        <span>Живой пример</span>
      </div>
      <img
        src={isResult ? result.imageUrl : MOUNTAINS}
        alt={isResult ? result.title : "Горный хребет на рассвете"}
        width="680"
        height="360"
        loading="lazy"
      />
      <div className="story-player-body">
        <p className="story-kicker">
          {isResult
            ? "Ваш результат"
            : current === "holiday"
              ? "01 / Начало истории"
              : "02 / Ваш выбор"}
        </p>
        <h3 ref={heading} tabIndex={-1}>
          {isResult ? result.title : question.question}
        </h3>
        {isResult ? (
          <>
            <p>{result.description}</p>
            <button className="potok-button" onClick={onCTA}>
              Создать свою историю <span aria-hidden>↗</span>
            </button>
          </>
        ) : (
          <div className="story-answers">
            {(question.answers ?? []).map((answer) => (
              <button key={answer.id} onClick={() => choose(answer.id)}>
                {answer.text}
                <span aria-hidden>→</span>
              </button>
            ))}
          </div>
        )}
        {current !== "holiday" && (
          <button
            className="story-reset"
            onClick={() => {
              setCurrent("holiday");
              requestAnimationFrame(() =>
                heading.current?.focus({ preventScroll: true }),
              );
            }}
          >
            Начать заново
          </button>
        )}
      </div>
    </div>
  );
}

function StoryCanvas({
  chapter,
  compact,
}: {
  chapter: number;
  compact: boolean;
}) {
  const [nodes, , onNodesChange] = useNodesState(storyNodes);
  const [flow, setFlow] = useState<ReactFlowInstance | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const frame = useCallback(() => {
    if (!flow || !container.current) return;
    const width = container.current.clientWidth;
    const height = container.current.clientHeight;
    const duration = reduced || compact ? 0 : 850;
    if (chapter === 0 || compact) {
      void flow.fitView({ padding: 0.08, duration, minZoom: 0.1, maxZoom: 1 });
    } else {
      void flow.setCenter(845, 160, {
        zoom: Math.min(width / 710, height / 570, 1.15),
        duration,
      });
    }
  }, [chapter, compact, flow, reduced]);
  useEffect(() => {
    frame();
    const observer = new ResizeObserver(frame);
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, [frame]);
  const activeEdges = new Set([
    "start-holiday",
    "mountain-experience",
    "first-weekend",
  ]);
  return (
    <div
      ref={container}
      className="story-canvas"
      aria-label="Пример графа: старт, три вопроса и четыре результата"
    >
      <ReactFlow
        nodes={nodes}
        edges={storyEdges.map((edge) => ({
          ...edge,
          className: activeEdges.has(edge.id) ? "story-edge-active" : "",
          animated: !reduced && chapter === 1 && activeEdges.has(edge.id),
        }))}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onInit={setFlow}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        nodesConnectable={false}
        nodesDraggable={!compact}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        deleteKeyCode={null}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#cccccc"
          gap={26}
          size={0.8}
        />
        {!compact && chapter === 1 && (
          <MiniMap
            pannable={false}
            zoomable={false}
            nodeColor="#48A9F3"
            maskColor="rgba(245,245,245,.7)"
          />
        )}
      </ReactFlow>
      <button
        className="story-fit"
        onClick={frame}
        aria-label="Восстановить вид графа"
      >
        ↺ <span>Вся схема</span>
      </button>
    </div>
  );
}

export default function FlowStory({ onCTA }: { onCTA: () => void }) {
  const root = useRef<HTMLElement>(null);
  const [chapter, setChapter] = useState(0);
  const compact = useCompactLayout();
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: root,
    offset: ["start start", "end end"],
  });
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (!compact) setChapter(value < 0.32 ? 0 : value < 0.7 ? 1 : 2);
  });
  const goToChapter = (index: number) => {
    if (compact) {
      document
        .getElementById(`story-chapter-${index}`)
        ?.scrollIntoView({
          behavior: reduced ? "instant" : "smooth",
          block: "start",
        });
      return;
    }
    if (!root.current) return;
    const top = root.current.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top:
        top +
        (root.current.offsetHeight - window.innerHeight) *
          [0, 0.47, 0.88][index],
      behavior: reduced ? "instant" : "smooth",
    });
  };
  return (
    <LazyMotion features={domAnimation}>
      <section
        ref={root}
        className={`flow-story ${compact ? "is-compact" : ""}`}
        aria-label="Ваши идеи в движении"
      >
        <div className={`story-stage chapter-${chapter}`}>
          <div className="story-scenery" aria-hidden="true" />
          <div className="story-dots" aria-hidden="true" />
          <div className="story-layout">
            <div
              id="story-chapter-0"
              className={`story-copy story-intro ${!compact && chapter !== 0 ? "story-hidden" : ""}`}
              inert={!compact && chapter !== 0}
            >
              <p className="story-kicker">
                Больше, чем конструктор - это Поток.
              </p>
              <h1>
                Собирайте.
                <br />
                Связывайте.
                <br />
                <em>
                  Оживляйте
                  <br className="story-desktop-break" /> идеи.
                </em>
              </h1>
              <p className="story-description">
                Квизы, уроки и сценарии
                <br />с живой логикой. Без программирования.
              </p>
              <div className="story-actions">
                <button className="potok-button" onClick={onCTA}>
                  Создать сценарий <span aria-hidden>↗</span>
                </button>
                <button
                  className="potok-button-secondary"
                  onClick={() => goToChapter(2)}
                >
                  <span aria-hidden>▷</span> Запустить демо
                </button>
              </div>
              <p className="story-signature">Ваши идеи в движении</p>
            </div>
            <m.div
              className="story-graph-wrap"
              animate={
                compact
                  ? { opacity: 1 }
                  : {
                      x: chapter === 1 ? "-61%" : "0%",
                      opacity: chapter === 2 ? 0 : 1,
                    }
              }
              transition={{
                duration: reduced ? 0 : 0.85,
                ease: [0.22, 1, 0.36, 1],
              }}
              inert={!compact && chapter === 2}
            >
              <ReactFlowProvider>
                <StoryCanvas chapter={chapter} compact={compact} />
              </ReactFlowProvider>
              <p className="story-annotation">
                Один сценарий —<br />
                много направлений
              </p>
            </m.div>
            <div
              id="story-chapter-1"
              className={`story-copy story-branch-copy ${!compact && chapter !== 1 ? "story-hidden" : ""}`}
              inert={!compact && chapter !== 1}
            >
              <p className="story-kicker">02 / Связывайте</p>
              <h2>
                Один вопрос.
                <br />
                <em>Разные истории.</em>
              </h2>
              <p className="story-description">
                Каждый ответ открывает свой путь. Соединяйте блоки и создавайте
                сценарии, которые реагируют на выбор.
              </p>
              <button className="potok-button" onClick={() => goToChapter(2)}>
                Попробовать развилку <span aria-hidden>↗</span>
              </button>
              <p className="story-signature">Логика, которая вдохновляет</p>
            </div>
            <div
              id="story-chapter-2"
              className={`story-finale ${!compact && chapter !== 2 ? "story-hidden" : ""}`}
              inert={!compact && chapter !== 2}
            >
              <div className="story-copy">
                <p className="story-kicker">03 / Оживляйте идеи</p>
                <h2>
                  Схема становится
                  <br />
                  <em>приключением.</em>
                </h2>
                <p className="story-description">
                  Выберите ответ — и пройдите по своей ветке. Именно так ваш
                  сценарий увидит участник.
                </p>
                <p className="story-signature">Ваши идеи в движении</p>
              </div>
              <StoryPlayer onCTA={onCTA} />
            </div>
          </div>
          <nav className="story-chapters" aria-label="Этапы создания сценария">
            {chapters.map((label, index) => (
              <button
                key={label}
                aria-current={chapter === index ? "step" : undefined}
                onClick={() => goToChapter(index)}
              >
                <span className="story-step-dot" />
                <span>0{index + 1}</span>
                {label}
              </button>
            ))}
            <span className="story-scroll-hint">
              Прокрутите — следуйте за идеей ↓
            </span>
          </nav>
        </div>
      </section>
    </LazyMotion>
  );
}
