import type { Edge, Node } from "reactflow";
import {
  CustomNodeType,
  type QuestionNodeData,
  type ResultNodeData,
} from "../../types";

export const MOUNTAINS = "/assets/landing/mountains.webp";
export const COAST = "/assets/landing/coast.webp";

export const storyNodes: Node[] = [
  {
    id: "story-start",
    type: CustomNodeType.Start,
    position: { x: 0, y: 280 },
    data: {},
  },
  {
    id: "holiday",
    type: CustomNodeType.Question,
    position: { x: 210, y: 230 },
    data: {
      question: "Какой отдых вам ближе?",
      answers: [
        { id: "mountain", text: "В горах" },
        { id: "sea", text: "У моря" },
      ],
    },
  },
  {
    id: "experience",
    type: CustomNodeType.Question,
    position: { x: 570, y: 30 },
    data: {
      question: "Ваш опыт походов?",
      answers: [
        { id: "first", text: "Первый раз" },
        { id: "often", text: "Хожу часто" },
      ],
    },
  },
  {
    id: "pace",
    type: CustomNodeType.Question,
    position: { x: 570, y: 490 },
    data: {
      question: "Какой ритм выберете?",
      answers: [
        { id: "calm", text: "Спокойный" },
        { id: "active", text: "Активный" },
      ],
    },
  },
  {
    id: "weekend",
    type: CustomNodeType.Result,
    position: { x: 940, y: -110 },
    data: {
      title: "Маршрут выходного дня",
      description: "Тропы, вершины и свежий воздух.",
      imageUrl: MOUNTAINS,
    },
  },
  {
    id: "summit",
    type: CustomNodeType.Result,
    position: { x: 940, y: 165 },
    data: {
      title: "Выше облаков",
      description: "Новая высота. Ваша история.",
      imageUrl: MOUNTAINS,
    },
  },
  {
    id: "bay",
    type: CustomNodeType.Result,
    position: { x: 940, y: 440 },
    data: {
      title: "Тихая бухта",
      description: "Море, солнце и спокойный ритм.",
      imageUrl: COAST,
    },
  },
  {
    id: "waves",
    type: CustomNodeType.Result,
    position: { x: 940, y: 715 },
    data: {
      title: "Навстречу волнам",
      description: "Для тех, кто выбирает движение.",
      imageUrl: COAST,
    },
  },
];

export const storyEdges: Edge[] = [
  { id: "start-holiday", source: "story-start", target: "holiday" },
  {
    id: "mountain-experience",
    source: "holiday",
    sourceHandle: "mountain",
    target: "experience",
  },
  { id: "sea-pace", source: "holiday", sourceHandle: "sea", target: "pace" },
  {
    id: "first-weekend",
    source: "experience",
    sourceHandle: "first",
    target: "weekend",
  },
  {
    id: "often-summit",
    source: "experience",
    sourceHandle: "often",
    target: "summit",
  },
  { id: "calm-bay", source: "pace", sourceHandle: "calm", target: "bay" },
  {
    id: "active-waves",
    source: "pace",
    sourceHandle: "active",
    target: "waves",
  },
].map((edge) => ({
  ...edge,
  type: "default",
  style: { stroke: "#48A9F3", strokeWidth: 2 },
}));

// The player and canvas share the same graph: every answer follows its actual edge.
export function nextStoryNode(nodeId: string, answerId: string) {
  return storyEdges.find(
    (edge) => edge.source === nodeId && edge.sourceHandle === answerId,
  )?.target;
}
export function storyQuestion(id: string) {
  return storyNodes.find((node) => node.id === id)?.data as QuestionNodeData;
}
export function storyResult(id: string) {
  return storyNodes.find((node) => node.id === id)?.data as ResultNodeData;
}
