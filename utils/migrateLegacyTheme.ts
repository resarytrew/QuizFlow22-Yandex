import type { Node } from 'reactflow';
import type { NodeData, SerializedQuizTemplateId } from '../types';

export interface LegacyThemeMigration {
  version: 1;
  original: unknown;
  unsupportedPaths: string[];
}

/** Pure conversion: keep a complete original for recovery and never touch other templates. */
export function migrateLegacyTheme<T extends { templateId?: SerializedQuizTemplateId; nodes: Node<NodeData>[] }>(input: T): T & { legacyThemeMigration?: LegacyThemeMigration } {
  if (input.templateId !== 'importantTalks') return input;
  const original = structuredClone(input);
  const unsupportedPaths: string[] = [];
  const nodes = input.nodes.map(node => {
    const data = { ...node.data };
    const legacy = 'importantTalks' in data ? data.importantTalks : undefined;
    if (legacy && typeof legacy === 'object') {
      for (const key of Object.keys(legacy)) unsupportedPaths.push(`nodes.${node.id}.importantTalks.${key}`);
      if ('importantTalks' in data) delete data.importantTalks;
    }
    return { ...node, data };
  });
  return { ...input, templateId: 'default', nodes, legacyThemeMigration: { version: 1, original, unsupportedPaths } };
}
