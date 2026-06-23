import type { QuizNode } from "../types";

export interface RendererContext {
  continueFrom(node: QuizNode, handle: string | null): boolean;
  navigateTo(nodeId: string): void;
  playSound(
    type: "click" | "correctAnswer" | "incorrectAnswer" | "achievement",
    overrideUrl?: string,
  ): void;
}

export type NodeRenderer = (
  node: QuizNode,
  controls: HTMLElement,
  context: RendererContext,
) => void;
