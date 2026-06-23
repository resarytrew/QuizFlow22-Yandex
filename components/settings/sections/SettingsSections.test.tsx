import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, usePreferencesStore } from '../../../store/usePreferencesStore';
import { EditorSection } from './EditorSection';
import { NodesVisualSection } from './NodesVisualSection';
import { PerformanceSection } from './PerformanceSection';
import { SidebarFiltersSection } from './SidebarFiltersSection';

describe('settings sections', () => {
  beforeEach(() => {
    usePreferencesStore.setState({
      preferences: { ...DEFAULT_PREFERENCES },
      presets: [],
      activePresetId: null,
    });
  });

  it('updates the canonical node preferences', () => {
    render(<NodesVisualSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Большой' }));
    fireEvent.click(screen.getAllByRole('checkbox')[0]);

    expect(usePreferencesStore.getState().preferences.nodeSize).toBe('lg');
    expect(usePreferencesStore.getState().preferences.nodeAnimations).toBe(false);
  });

  it('updates node palette filters', () => {
    render(<SidebarFiltersSection />);
    const toggles = screen.getAllByRole('checkbox');

    fireEvent.click(toggles[0]);
    fireEvent.click(toggles[2]);

    expect(usePreferencesStore.getState().preferences.onlyFree).toBe(true);
    expect(usePreferencesStore.getState().preferences.hideUnavailable).toBe(true);
  });

  it('toggles edge animations from editor settings', () => {
    render(<EditorSection />);

    const toggle = screen.getByRole('checkbox', { name: 'Анимация соединений' });
    fireEvent.click(toggle);

    expect(usePreferencesStore.getState().preferences.edgeAnimations).toBe(false);
  });

  it('enables the simplified low-load mode', () => {
    render(<PerformanceSection />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Упрощённый режим' }));

    expect(usePreferencesStore.getState().preferences.simplified).toBe(true);
  });
});
