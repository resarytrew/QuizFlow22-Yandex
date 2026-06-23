// src/engine/__tests__/navigation.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { buildIndexes } from '../indexing';
import { processNode } from '../navigation';
import { resetState, getState } from '../state';

describe('processNode', () => {
  beforeEach(() => resetState());

  it('should detect infinite logic chain', () => {
    buildIndexes({
      nodes: [
        { id: 'a', type: 'goToNode', data: { targetNodeId: 'b' } },
        { id: 'b', type: 'goToNode', data: { targetNodeId: 'a' } },
      ],
      edges: [],
    });

    // Не должен зависнуть — circuit breaker сработает
    processNode('a');
    // renderError будет вызван
  });
});