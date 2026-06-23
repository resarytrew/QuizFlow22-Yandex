import type { NodeRenderer } from "./types";
import { renderQuestion, renderMultipleChoice } from "./choices";
import { renderMatching, renderTimeline } from "./arrangement";
import { renderTextInput, renderCollectInfo, renderAllocator } from "./input";
import {
  renderDefault,
  renderDialogue,
  renderFeedback,
  renderInfo,
  renderResult,
  renderTimer,
} from "./basic";

export const nodeRenderers: Record<string, NodeRenderer> = {
  questionNode: renderQuestion,
  multipleChoiceNode: renderMultipleChoice,
  matchingNode: renderMatching,
  timelineNode: renderTimeline,
  textInputNode: renderTextInput,
  collectInfoNode: renderCollectInfo,
  allocatorNode: renderAllocator,
  dialogueNode: renderDialogue,
  timerNode: renderTimer,
  infoNode: renderInfo,
  feedbackNode: renderFeedback,
  resultNode: renderResult,
};

export { renderDefault };
export type { RendererContext } from "./types";
