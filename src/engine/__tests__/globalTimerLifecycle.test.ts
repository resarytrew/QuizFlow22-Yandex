import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupGlobalTimer } from '../globalTimer';
import { buildIndexes } from '../indexing';
import { processNode } from '../navigation';
import { resetState } from '../state';

vi.mock('../render', () => ({ renderNode: vi.fn(), renderError: vi.fn() }));
vi.mock('../hud', () => ({ updateHUD: vi.fn() }));
vi.mock('../media', () => ({ playNodeEntrySound: vi.fn() }));

describe('global timer lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="global-timer-container"></div><div id="quiz-view"></div>';
    resetState();
    buildIndexes({ nodes: [{ id: 'result', type: 'resultNode', data: {} }], edges: [] });
  });
  afterEach(() => { resetState(); vi.useRealTimers(); });

  it('stops the timer when a result is reached', () => {
    const navigate = vi.fn();
    setupGlobalTimer({ enabled: true, duration: 2, onTimeoutNodeId: 'result' }, navigate);
    processNode('result');
    vi.advanceTimersByTime(3000);
    expect(navigate).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops the previous timer when a new session starts or is reset', () => {
    const oldNavigate = vi.fn();
    const newNavigate = vi.fn();
    const disposeOld = setupGlobalTimer({ enabled: true, duration: 1, onTimeoutNodeId: 'result' }, oldNavigate);
    setupGlobalTimer({ enabled: true, duration: 2, onTimeoutNodeId: 'result' }, newNavigate);
    disposeOld();
    vi.advanceTimersByTime(1000);
    expect(oldNavigate).not.toHaveBeenCalled();
    expect(newNavigate).not.toHaveBeenCalled();
    resetState();
    vi.advanceTimersByTime(2000);
    expect(newNavigate).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shows a safe timeout message when the target was deleted', () => {
    const navigate = vi.fn();
    setupGlobalTimer({ enabled: true, duration: 1, onTimeoutNodeId: 'deleted' }, navigate, (id) => id === 'result');
    vi.advanceTimersByTime(1000);
    expect(navigate).not.toHaveBeenCalled();
    expect(document.getElementById('quiz-view')?.textContent).toBe('Время вышло.');
  });
});
