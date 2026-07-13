import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuizDataStore } from './useQuizDataStore';
import {
  createFreeLayoutDocumentFromMeasurements,
  createLayoutModePatch,
  getLayoutMode,
} from '../src/designMode/layoutDocument';

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

describe('useQuizDataStore design history', () => {
  beforeEach(() => {
    useQuizDataStore.getState().reset();
  });

  it('undoes and redoes manual design updates', () => {
    useQuizDataStore.getState().updateDesignSettings({
      buttons: { borderRadius: 0 },
    });

    expect(useQuizDataStore.getState().designSettings.buttons.borderRadius).toBe(0);
    expect(useQuizDataStore.getState().canUndoDesign).toBe(true);

    useQuizDataStore.getState().undoDesignChange();
    expect(useQuizDataStore.getState().designSettings.buttons.borderRadius).toBe(18);
    expect(useQuizDataStore.getState().canRedoDesign).toBe(true);

    useQuizDataStore.getState().redoDesignChange();
    expect(useQuizDataStore.getState().designSettings.buttons.borderRadius).toBe(0);
  });

  it('coalesces repeated slider updates into one history entry', () => {
    useQuizDataStore.getState().updateDesignSettings(
      { layout: { cardRadius: 4 } },
      { coalesceKey: 'layout.cardRadius' },
    );
    useQuizDataStore.getState().updateDesignSettings(
      { layout: { cardRadius: 8 } },
      { coalesceKey: 'layout.cardRadius' },
    );
    useQuizDataStore.getState().updateDesignSettings(
      { layout: { cardRadius: 12 } },
      { coalesceKey: 'layout.cardRadius' },
    );

    expect(useQuizDataStore.getState().designHistory.past).toHaveLength(1);
    expect(useQuizDataStore.getState().designSettings.layout?.cardRadius).toBe(12);

    useQuizDataStore.getState().undoDesignChange();
    expect(useQuizDataStore.getState().designSettings.layout?.cardRadius).toBe(28);
  });

  it('applies one style after another without inheriting previous style leftovers', () => {
    useQuizDataStore.getState().applyDesignStylePreset('style-a', {
      brand: { experiencePreset: 'minimal' },
      layout: { cardRadius: 0 },
      buttons: { borderRadius: 0 },
    });
    useQuizDataStore.getState().applyDesignStylePreset('style-b', {
      brand: { experiencePreset: 'assessment' },
      layout: { cardRadius: 32 },
    });

    const state = useQuizDataStore.getState();
    expect(state.activeDesignStyleId).toBe('style-b');
    expect(state.designStatus).toBe('applied');
    expect(state.designSettings.layout?.cardRadius).toBe(32);
    expect(state.designSettings.buttons.borderRadius).toBe(18);
  });

  it('marks an active style as modified after manual overrides', () => {
    useQuizDataStore.getState().applyDesignStylePreset('style-a', {
      layout: { cardRadius: 4 },
    });
    useQuizDataStore.getState().updateDesignSettings({
      layout: { cardRadius: 10 },
    });

    expect(useQuizDataStore.getState().designStatus).toBe('modified');
    expect(useQuizDataStore.getState().activeDesignStyleId).toBe('style-a');
  });

  it('resets a property to the active style baseline', () => {
    useQuizDataStore.getState().applyDesignStylePreset('style-a', {
      layout: { cardRadius: 6 },
    });
    useQuizDataStore.getState().updateDesignSettings({
      layout: { cardRadius: 20 },
    });

    useQuizDataStore.getState().resetDesignProperty('layout.cardRadius');

    expect(useQuizDataStore.getState().designSettings.layout?.cardRadius).toBe(6);
  });

  it('resets a section, screen settings and the entire design', () => {
    useQuizDataStore.getState().updateDesignSettings({
      background: { color: '#000000' },
      screenQuiz: { radius: 0 },
    });

    useQuizDataStore.getState().resetDesignSection('background');
    expect(useQuizDataStore.getState().designSettings.background.color).toBe('#f6f3ee');

    useQuizDataStore.getState().resetDesignScreen();
    expect(useQuizDataStore.getState().designSettings.screenQuiz?.radius).toBe(54);

    useQuizDataStore.getState().updateDesignSettings({ buttons: { borderRadius: 0 } });
    useQuizDataStore.getState().resetAllDesign();
    expect(useQuizDataStore.getState().designSettings.buttons.borderRadius).toBe(18);
    expect(useQuizDataStore.getState().designStatus).toBe('custom');
  });

  it('loads a legacy quiz without design asset metadata', () => {
    useQuizDataStore.getState().loadQuiz({
      id: 'legacy-quiz',
      user_id: 'user-1',
      name: 'Legacy quiz',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      is_published: false,
      quiz_data: {
        nodes: [],
        edges: [],
        templateId: 'default',
        designSettings: {
          background: { color: '#abcdef' },
        },
      },
    } as never);

    const state = useQuizDataStore.getState();
    expect(state.designSettings.background.color).toBe('#abcdef');
    expect(state.activeDesignStyleId).toBeNull();
    expect(state.designStatus).toBe('custom');
    expect(state.canUndoDesign).toBe(false);
  });

  it('undoes free layout mode transitions', () => {
    const freeDocument = createFreeLayoutDocumentFromMeasurements({
      viewport: { width: 1000, height: 500 },
      elements: [
        { id: 'media', role: 'media', nodeId: null, rect: { x: 100, y: 80, width: 300, height: 180 } },
      ],
    });

    useQuizDataStore.getState().updateDesignSettings(
      createLayoutModePatch(useQuizDataStore.getState().designSettings, { scope: 'global' }, 'free', freeDocument) as never,
      { label: 'Enable free layout' },
    );

    expect(getLayoutMode(useQuizDataStore.getState().designSettings)).toBe('free');

    useQuizDataStore.getState().undoDesignChange();
    expect(getLayoutMode(useQuizDataStore.getState().designSettings)).toBe('auto');

    useQuizDataStore.getState().redoDesignChange();
    expect(getLayoutMode(useQuizDataStore.getState().designSettings)).toBe('free');
  });
});
