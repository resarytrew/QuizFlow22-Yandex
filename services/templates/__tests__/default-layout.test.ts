// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { buildDesignCss } from '../../quizGenerator/designCss';
import defaultTemplate from '../default';

describe('default template visual hierarchy', () => {
  it('renders the heading before media and supporting content', () => {
    expect(defaultTemplate).toMatch(/\.node-title\s*{[\s\S]*?order:\s*1;/);
    expect(defaultTemplate).toMatch(/\.media-frame,[\s\S]*?order:\s*2;/);
    expect(defaultTemplate).toMatch(/\.node-desc\s*{[\s\S]*?order:\s*3;/);
    expect(defaultTemplate).toMatch(/\.node-controls\s*{[\s\S]*?order:\s*4;/);
  });

  it('keeps the main surface flat instead of stacking decorative frames', () => {
    expect(defaultTemplate).not.toContain('.quiz-stage::before');
    expect(defaultTemplate).not.toContain('#quiz-view::before');
    expect(defaultTemplate).not.toContain('#quiz-view::after');
    expect(defaultTemplate).toMatch(/--shadow-soft:\s*0 10px 32px rgba\(15, 23, 42, 0\.07\);/);
  });

  it('does not render a second card around the question content', () => {
    const css = buildDesignCss({
      questionCard: {
        backgroundColor: '#fffefa',
        borderColor: '#dfd8cc',
        radius: 28,
      },
    });

    expect(css).toMatch(/#quiz-view\s*{[\s\S]*?border-color:\s*var\(--question-card-border\);/);
    expect(css).toMatch(/\.node-frame\s*{[\s\S]*?border:\s*0;/);
    expect(css).toMatch(/\.node-frame\s*{[\s\S]*?background:\s*transparent;/);
    expect(css).not.toContain('body.design-surface-paper .node-frame');
  });

  it('hides the empty achievements panel when :has is supported', () => {
    expect(defaultTemplate).toContain(
      '.hud-panel:has(#achievements-list):not(:has(.ach-slot.unlocked))',
    );
  });
});
