import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useQuizDataStore } from '../../../store/useQuizDataStore';
import { SoundSection } from './SoundSection';
import { TemplateSection } from './TemplateSection';

describe('quiz settings sections', () => {
  beforeEach(() => {
    useQuizDataStore.getState().reset();
  });

  it('changes the quiz template', () => {
    render(<TemplateSection />);
    fireEvent.click(screen.getByRole('button', { name: /Научный терминал/ }));

    expect(useQuizDataStore.getState().templateId).toBe('science');
  });

  it('changes sound volume in quiz design settings', () => {
    render(<SoundSection />);
    fireEvent.change(screen.getByRole('slider', { name: 'Громкость' }), {
      target: { value: '0.8' },
    });

    expect(useQuizDataStore.getState().designSettings.sound.volume).toBe(0.8);
  });
});
