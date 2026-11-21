import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import DesignPanel from './DesignPanel';
import { useQuizDataStore } from '../store/useQuizDataStore';
import { buildDesignCss } from '../services/quizGenerator/designCss';

describe('design workspace', () => {
  beforeEach(() => useQuizDataStore.getState().reset());
  afterEach(cleanup);
  it('applies five distinct themes without discarding legacy settings and emits their values to published CSS', () => {
    useQuizDataStore.getState().updateDesignSettings({ advanced: { customCss: '.custom { color: red; }' } });
    render(<DesignPanel />);
    const backgrounds = new Set<string>();
    for (const name of ['Светлый', 'Тёмный', 'Редакционный', 'Игровой', 'Строгий']) {
      fireEvent.click(screen.getByRole('button', { name }));
      const ds = useQuizDataStore.getState().designSettings;
      backgrounds.add(ds.background.color);
      expect(ds.advanced?.customCss).toBe('.custom { color: red; }');
      const css = buildDesignCss(ds);
      expect(css).toContain(`--bg-color: ${ds.background.color}`);
      expect(css).toContain(`--question-card-radius: ${ds.questionCard?.radius}px`);
      expect(css).toContain(`--card-padding: ${ds.layout?.cardPadding}px`);
    }
    expect(backgrounds.size).toBe(5);
    expect(screen.queryByRole('tablist')).toBeNull();
  });
  it('keeps local media placement synchronized with the layout and updates progress', () => {
    render(<DesignPanel />);
    fireEvent.change(screen.getByLabelText('Расположение изображения'), { target: { value: 'right' } });
    fireEvent.click(screen.getByLabelText('Показывать прогресс'));
    const ds = useQuizDataStore.getState().designSettings;
    expect(ds.layout?.mediaPosition).toBe('right');
    expect(ds.questionCard?.mediaPosition).toBe('right');
    expect(ds.progress?.style).toBe('hidden');
    expect(buildDesignCss(ds)).toContain('display: none');
  });
});
