export const MAX_LOGIC_CHAIN = 100;
export const MAX_PATH_LENGTH = 1000;
export const MAX_RESOLVE_DEPTH = 20;
export const ANIMATION_FRAME_RATE = 16; // ms
export const DEBOUNCE_SAVE = 500;

export const INTERACTIVE_TYPES = [
  'questionNode', 'multipleChoiceNode', 'matchingNode',
  'timelineNode', 'textInputNode', 'collectInfoNode', 'allocatorNode',
  'dialogueNode',
] as const;

export const RENDERED_TYPES = [
  'questionNode',
  'multipleChoiceNode',
  'matchingNode',
  'timelineNode',
  'textInputNode',
  'collectInfoNode',
  'allocatorNode',
  'dialogueNode',
  'timerNode',
  'infoNode',
  'feedbackNode',
  'resultNode',
] as const;

export const LOGIC_TYPES = [
  'startNode', 'scoreNode', 'variableNode', 'conditionNode',
  'formulaNode', 'goToNode', 'achievementNode', 'progressionNode',
] as const;

export const ALLOWED_HTML_TAGS = [
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a',
  'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'pre', 'code',
  'span', 'div', 'img',
] as const;

export const ALLOWED_HTML_ATTRS = [
  'href', 'target', 'rel', 'class', 'title', 'src', 'alt',
] as const;
