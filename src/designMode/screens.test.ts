import { describe, expect, it } from 'vitest';
import type { Edge, Node } from 'reactflow';
import { CustomNodeType, type NodeData } from '../../types';
import { getAdjacentScreenIds, getDesignModeScreens } from './screens';

function node(id: string, type: CustomNodeType, label: string): Node<NodeData> {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { label },
  };
}

describe('design mode screens', () => {
  it('orders reachable screens from the start node and appends orphan screens', () => {
    const nodes = [
      node('start', CustomNodeType.Start, 'Start'),
      node('q1', CustomNodeType.Question, 'Question 1'),
      node('score', CustomNodeType.Score, 'Score'),
      node('result', CustomNodeType.Result, 'Result'),
      node('orphan', CustomNodeType.Info, 'Orphan'),
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'start', target: 'q1' },
      { id: 'e2', source: 'q1', target: 'score' },
      { id: 'e3', source: 'score', target: 'result' },
    ];

    const screens = getDesignModeScreens(nodes, edges);

    expect(screens.map((screen) => screen.id)).toEqual(['start', 'q1', 'result', 'orphan']);
    expect(screens.at(-1)?.reachable).toBe(false);
  });

  it('returns adjacent screen ids for compact navigation', () => {
    const screens = [
      { id: 'start', label: 'Start', type: 'startNode', reachable: true },
      { id: 'q1', label: 'Question', type: 'questionNode', reachable: true },
      { id: 'result', label: 'Result', type: 'resultNode', reachable: true },
    ];

    expect(getAdjacentScreenIds(screens, 'q1')).toEqual({
      current: 'q1',
      previous: 'start',
      next: 'result',
    });
  });
});
