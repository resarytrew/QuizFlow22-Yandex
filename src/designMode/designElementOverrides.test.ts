import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuizDataStore } from '../../store/useQuizDataStore';
import {
  DEFAULT_ELEMENT_ORDER,
  buildDesignOverrideContext,
  createResetElementOverridePatch,
  createResetNodeOverridePatch,
  createScopedDesignPatch,
  createScopedResetPatch,
  resolveDesignProperty,
  type DesignSettingsWithElementOverrides,
} from './designElementOverrides';
import type { Node } from 'reactflow';
import { CustomNodeType, type NodeData } from '../../types';

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

const nodes: Node<NodeData>[] = [
  {
    id: 'q1',
    type: CustomNodeType.Question,
    position: { x: 0, y: 0 },
    data: { label: 'Question', question: 'Text', answers: [] },
  },
];

function questionCardContext() {
  return buildDesignOverrideContext('question-card', 'q1', nodes);
}

function settingsWithOverrides() {
  return useQuizDataStore.getState().designSettings as DesignSettingsWithElementOverrides;
}

describe('design element scoped overrides', () => {
  beforeEach(() => {
    useQuizDataStore.getState().reset();
  });

  it('stores global design changes through existing DesignSettings', () => {
    const context = questionCardContext();

    useQuizDataStore.getState().updateDesignSettings(
      createScopedDesignPatch(
        useQuizDataStore.getState().designSettings,
        'global',
        context,
        'questionCard.backgroundColor',
        '#111111',
        'design',
      ),
    );

    expect(useQuizDataStore.getState().designSettings.questionCard?.backgroundColor).toBe('#111111');
    expect(settingsWithOverrides().elementOverrides?.nodes).toBeUndefined();
  });

  it('stores node type and node overrides without copying full DesignSettings', () => {
    const context = questionCardContext();

    useQuizDataStore.getState().updateDesignSettings(
      createScopedDesignPatch(
        useQuizDataStore.getState().designSettings,
        'nodeType',
        context,
        'questionCard.radius',
        12,
        'design',
      ),
    );
    useQuizDataStore.getState().updateDesignSettings(
      createScopedDesignPatch(
        useQuizDataStore.getState().designSettings,
        'node',
        context,
        'questionCard.backgroundColor',
        '#222222',
        'design',
      ),
    );

    const overrides = settingsWithOverrides().elementOverrides;
    expect(overrides?.nodeTypes?.questionNode?.['question-card']?.questionCard).toEqual({ radius: 12 });
    expect(overrides?.nodes?.q1?.['question-card']?.questionCard).toEqual({ backgroundColor: '#222222' });
    expect(overrides?.nodes?.q1?.['question-card']?.brand).toBeUndefined();
    expect(overrides?.nodes?.q1?.['question-card']?.buttons).toBeUndefined();
  });

  it('resolves inheritance from global design to node type and node overrides', () => {
    const context = questionCardContext();

    useQuizDataStore.getState().updateDesignSettings(
      createScopedDesignPatch(useQuizDataStore.getState().designSettings, 'global', context, 'questionCard.radius', 20, 'design'),
    );
    expect(resolveDesignProperty(useQuizDataStore.getState().designSettings, context, 'questionCard.radius', 'design', 28, null)).toMatchObject({
      value: 20,
      source: 'global',
    });

    useQuizDataStore.getState().updateDesignSettings(
      createScopedDesignPatch(useQuizDataStore.getState().designSettings, 'nodeType', context, 'questionCard.radius', 10, 'design'),
    );
    expect(resolveDesignProperty(useQuizDataStore.getState().designSettings, context, 'questionCard.radius', 'design', 28, null)).toMatchObject({
      value: 10,
      source: 'nodeType',
    });

    useQuizDataStore.getState().updateDesignSettings(
      createScopedDesignPatch(useQuizDataStore.getState().designSettings, 'node', context, 'questionCard.radius', 4, 'design'),
    );
    expect(resolveDesignProperty(useQuizDataStore.getState().designSettings, context, 'questionCard.radius', 'design', 28, null)).toMatchObject({
      value: 4,
      source: 'node',
    });
  });

  it('resets property, element override and node override', () => {
    const context = questionCardContext();

    useQuizDataStore.getState().updateDesignSettings(
      createScopedDesignPatch(useQuizDataStore.getState().designSettings, 'node', context, 'questionCard.radius', 4, 'design'),
    );
    useQuizDataStore.getState().updateDesignSettings(
      createScopedResetPatch(useQuizDataStore.getState().designSettings, 'node', context, 'questionCard.radius'),
    );
    expect(settingsWithOverrides().elementOverrides?.nodes?.q1?.['question-card']).toBeUndefined();

    useQuizDataStore.getState().updateDesignSettings(
      createScopedDesignPatch(useQuizDataStore.getState().designSettings, 'node', context, 'questionCard.radius', 4, 'design'),
    );
    useQuizDataStore.getState().updateDesignSettings(
      createResetElementOverridePatch(useQuizDataStore.getState().designSettings, 'node', context),
    );
    expect(settingsWithOverrides().elementOverrides?.nodes?.q1).toBeUndefined();

    useQuizDataStore.getState().updateDesignSettings(
      createScopedDesignPatch(useQuizDataStore.getState().designSettings, 'node', context, 'questionCard.radius', 4, 'design'),
    );
    useQuizDataStore.getState().updateDesignSettings(
      createResetNodeOverridePatch(useQuizDataStore.getState().designSettings, 'q1'),
    );
    expect(settingsWithOverrides().elementOverrides?.nodes).toBeUndefined();
  });

  it('supports undo and redo for scoped inspector actions', () => {
    const context = questionCardContext();

    useQuizDataStore.getState().updateDesignSettings(
      createScopedDesignPatch(useQuizDataStore.getState().designSettings, 'node', context, 'questionCard.radius', 4, 'design'),
    );
    expect(settingsWithOverrides().elementOverrides?.nodes?.q1?.['question-card']?.questionCard).toEqual({ radius: 4 });

    useQuizDataStore.getState().undoDesignChange();
    expect(settingsWithOverrides().elementOverrides?.nodes).toBeUndefined();

    useQuizDataStore.getState().redoDesignChange();
    expect(settingsWithOverrides().elementOverrides?.nodes?.q1?.['question-card']?.questionCard).toEqual({ radius: 4 });
  });

  it('stores semantic element order and loads legacy quizzes without overrides', () => {
    const context = questionCardContext();
    const reversed = [...DEFAULT_ELEMENT_ORDER].reverse();

    useQuizDataStore.getState().updateDesignSettings(
      createScopedDesignPatch(useQuizDataStore.getState().designSettings, 'global', context, 'layout.elementOrder', reversed, 'design'),
    );
    expect(settingsWithOverrides().layout?.elementOrder).toEqual(reversed);

    useQuizDataStore.getState().loadQuiz({
      id: 'legacy',
      user_id: 'u1',
      name: 'Legacy',
      created_at: '',
      updated_at: '',
      is_published: false,
      quiz_data_loaded: true,
      quiz_data: {
        nodes: [],
        edges: [],
        globalTimer: { enabled: false, duration: 0, onTimeoutNodeId: null },
        designSettings: { background: { color: '#ffffff', imageUrl: '', overlayColor: '#ffffff', overlayOpacity: 0 }, typography: { fontFamily: 'Inter', headingColor: '#111111', bodyTextColor: '#222222' }, buttons: { backgroundColor: '#111111', textColor: '#ffffff', hoverBackgroundColor: '#222222', hoverTextColor: '#ffffff', borderRadius: 8 }, answerCards: { backgroundColor: '#ffffff', textColor: '#111111', hoverBackgroundColor: '#eeeeee', hoverTextColor: '#111111', selectedBackgroundColor: '#dddddd', selectedTextColor: '#111111', borderRadius: 8 }, sound: { volume: 0.5 } },
        templateId: 'default',
        currentQuizName: 'Legacy',
      },
    });

    expect(settingsWithOverrides().elementOverrides).toBeUndefined();
  });
});
