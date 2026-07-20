// @vitest-environment node

import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { generateQuizHtmlProgrammatically } from '../quizGenerator';
import importantTalksTemplate from './importantTalks';

const RUNTIME_IDS = [
  'header-logo',
  'header-title',
  'talks-brand-primary',
  'talks-brand-secondary',
  'talks-mode-title',
  'talks-step-current',
  'talks-step-total',
  'hud-avatar-image',
  'hud-avatar-fallback',
  'hud-name',
  'global-timer-container',
  'hud-score-label',
  'hud-score',
  'top-progress-fill',
  'progress-text',
  'quiz-view',
  'ach-count',
  'achievements-list',
  'hud-variables-container',
  'hud-variables-list',
  'progress-ring',
  'progress-text-sidebar',
] as const;

describe('Important Talks template', () => {
  it('keeps runtime hooks unique and styles the interactive node families', () => {
    expect(importantTalksTemplate).toContain('class="important-talks-theme"');
    expect(importantTalksTemplate).toContain('id="important-talks-theme"');
    expect(importantTalksTemplate).toContain('id="important-talks-shell-v2"');
    expect(importantTalksTemplate).toContain('id="important-talks-info-scene-v3"');
    expect(importantTalksTemplate).toContain('id="important-talks-question-scene-v4"');
    expect(importantTalksTemplate).toContain('id="important-talks-result-scene-v5"');
    expect(importantTalksTemplate).toContain('/assets/important-talks/family-values.webp');
    expect(importantTalksTemplate).toContain('/assets/important-talks/single-choice-friendship.webp');
    expect(importantTalksTemplate).toContain('/assets/important-talks/result-shared-values.webp');
    expect(importantTalksTemplate).toContain('class="talks-ribbon"');
    expect(importantTalksTemplate).toContain('class="talks-background-decor"');
    expect(importantTalksTemplate).toContain('data-node-type="multipleChoiceNode"');
    expect(importantTalksTemplate).toContain('.match-grid');
    expect(importantTalksTemplate).toContain('.timeline-container');
    expect(importantTalksTemplate).toContain('data-node-type="textInputNode"');
    expect(importantTalksTemplate).toContain('.dialogue-card');
    expect(importantTalksTemplate).toContain('.result-summary');

    for (const id of RUNTIME_IDS) {
      const occurrences = importantTalksTemplate.match(new RegExp(`id="${id}"`, 'g')) ?? [];
      expect(occurrences, `duplicate or missing #${id}`).toHaveLength(1);
    }
  });

  it('renders with the shared engine and applies editable HUD fields', async () => {
    const html = generateQuizHtmlProgrammatically(
      [
        {
          id: 'start',
          type: 'startNode',
          position: { x: 0, y: 0 },
          data: { label: 'Старт' },
        },
        {
          id: 'info',
          type: 'infoNode',
          position: { x: 0, y: 120 },
          data: {
            title: 'Ценности, которые нас объединяют',
            description: 'Сегодня мы поговорим о взаимопонимании и уважении.',
            imageUrl: 'https://example.com/family.png',
            buttonText: 'Начать',
            importantTalks: {
              agendaTitle: 'Что вас ждёт',
              agendaItems: ['6 заданий', 'проверка знаний', 'полезные размышления'],
            },
          },
        },
        {
          id: 'question',
          type: 'questionNode',
          position: { x: 0, y: 240 },
          data: {
            question: 'Какое качество помогает людям понимать друг друга?',
            importantTalks: { instruction: 'Выберите один ответ' },
            answers: [
              { id: 'respect', text: 'Уважение', isCorrect: true },
              { id: 'indifference', text: 'Равнодушие' },
              { id: 'egoism', text: 'Эгоизм' },
              { id: 'irresponsibility', text: 'Безответственность' },
            ],
          },
        },
      ],
      [
        { id: 'start-info', source: 'start', target: 'info' },
        { id: 'info-question', source: 'info', target: 'question' },
      ],
      { enabled: true, duration: 600, onTimeoutNodeId: null },
      {
        brand: {
          brandName: 'Разговоры о важном',
          avatarUrl: 'https://example.com/avatar.png',
          scoreLabel: 'Светлые поступки',
          primaryColor: '#0b4dcc',
          accentColor: '#e5242f',
          neutralColor: '#071f58',
        },
      },
      'important-talks-test',
      'importantTalks',
      'Разговоры о важном',
    );

    expect(html).toContain('id="quiz-design-settings"');

    const executableHtml = html
      .replace(/<meta[^>]*Content-Security-Policy[^>]*>/gi, '')
      .replace(/<script[^>]*\bsrc=[^>]*><\/script>/gi, '');
    const dom = new JSDOM(executableHtml, {
      runScripts: 'dangerously',
      url: 'http://localhost/',
      pretendToBeVisual: true,
    });

    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(dom.window.document.body.classList.contains('important-talks-theme')).toBe(true);
    expect(dom.window.document.querySelector('#hud-score-label')?.textContent).toBe('Светлые поступки');
    expect(dom.window.document.querySelector<HTMLImageElement>('#hud-avatar-image')?.src).toBe('https://example.com/avatar.png');
    expect(dom.window.document.querySelector('#talks-brand-primary')?.textContent).toBe('РАЗГОВОРЫ');
    expect(dom.window.document.querySelector('#talks-brand-secondary')?.textContent).toBe('О ВАЖНОМ');
    expect(dom.window.document.querySelector('#talks-mode-title')?.textContent).toBe('Информация');
    expect(dom.window.document.querySelector('#talks-step-current')?.textContent).toBe('1');
    expect(dom.window.document.querySelector('#talks-step-total')?.textContent).toBe('2');
    expect(dom.window.document.querySelector('.node-frame')?.getAttribute('data-node-type')).toBe('infoNode');
    expect(dom.window.document.querySelector('.node-frame')?.classList.contains('talks-info-scene')).toBe(true);
    expect(dom.window.document.querySelector('.talks-info-visual .media-frame')).not.toBeNull();
    expect(dom.window.document.querySelector('.talks-info-intro .node-desc')?.textContent).toContain('взаимопонимании');
    expect(dom.window.document.querySelector('.talks-info-agenda-title')?.textContent).toBe('Что вас ждёт');
    expect(dom.window.document.querySelectorAll('.talks-info-agenda-item')).toHaveLength(3);
    expect(dom.window.document.querySelector('.node-title')?.textContent).toContain('Ценности');
    expect(dom.window.document.querySelector('#global-timer-container')?.classList.contains('hidden')).toBe(false);

    dom.window.document.querySelector<HTMLButtonElement>('.talks-info-cta')?.click();

    expect(dom.window.document.querySelector('.node-frame')?.classList.contains('talks-question-scene')).toBe(true);
    expect(dom.window.document.querySelector('.talks-question-media-fallback')).not.toBeNull();
    expect(dom.window.document.querySelector('.talks-question-prompt')?.textContent).toContain('Какое качество');
    expect(dom.window.document.querySelector('.talks-question-instruction')?.textContent).toBe('Выберите один ответ');
    expect(dom.window.document.querySelectorAll('.talks-question-options .option')).toHaveLength(4);

    dom.window.close();
  });
});
