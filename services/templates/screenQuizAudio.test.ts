// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import screenQuizTemplate from './screenQuiz';

describe('screen quiz editor audio', () => {
  it('does not create or autoplay configured sound in preview', async () => {
    const createAudio = vi.fn();
    const data = { preview: true, nodes: [{ id: 'q', type: 'questionNode', data: { question: 'Вопрос', answers: [], soundSettings: { onEntry: 'https://example.invalid/entry.mp3' } } }], edges: [], designSettings: { screenQuiz: { introEnabled: false, timerSeconds: 5 }, sound: { backgroundMusic: 'https://example.invalid/music.mp3', screenQuizIntro: 'https://example.invalid/intro.mp3' } } };
    const html = screenQuizTemplate.replace('%%QUIZ_DATA_INJECTION%%', JSON.stringify(data));
    const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true,
      beforeParse(window: Window & typeof globalThis) { window.Audio = function () { createAudio(); return { play: () => Promise.resolve(), addEventListener() {}, pause() {} }; } as unknown as typeof Audio; } });
    try {
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(createAudio).not.toHaveBeenCalled();
      expect(dom.window.document.getElementById('sq-scene')?.textContent).toContain('Вопрос');
    } finally { dom.window.close(); }
  });
  it('renders an explicit empty local background instead of inheriting the shared image', async () => {
    const data = { preview: true, nodes: [{ id: 'q', type: 'infoNode', data: { title: 'Сцена', screenQuiz: { backgroundImageUrl: '', timerSeconds: 5 } } }], edges: [], designSettings: { screenQuiz: { backgroundPreset: 'none', backgroundImageUrl: 'https://example.invalid/image.png', timerSeconds: 30 } } };
    const html = screenQuizTemplate.replace('%%QUIZ_DATA_INJECTION%%', JSON.stringify(data));
    const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(dom.window.document.documentElement.style.getPropertyValue('--sq-bg-image')).toBe('none');
      expect(dom.window.document.documentElement.style.getPropertyValue('--sq-duration')).toBe('5s');
    } finally { dom.window.close(); }
  });

});
