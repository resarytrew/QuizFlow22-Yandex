// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { generateQuizHtml } from '../quizGenerator';

describe('published HTML global timer', () => {
  it('keeps the result visible after the global deadline', async () => {
    const html = generateQuizHtml({
      nodes: [{ id: 'result', type: 'resultNode', position: { x: 0, y: 0 }, data: { title: 'Готово' } }],
      edges: [], startNodeId: 'result', templateId: 'default',
      globalTimer: { enabled: true, duration: 1, onTimeoutNodeId: null },
    }).replace(/<meta[^>]*Content-Security-Policy[^>]*>/gi, '')
      .replace(/<script[^>]*\bsrc=[^>]*><\/script>/gi, '');
    const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true });
    try {
      await new Promise<void>(resolve => dom.window.addEventListener('load', () => resolve(), { once: true }));
      expect(dom.window.document.querySelector('[data-node-type="resultNode"]')).not.toBeNull();
      await new Promise(resolve => setTimeout(resolve, 1200));
      expect(dom.window.document.querySelector('[data-node-type="resultNode"]')).not.toBeNull();
      expect(dom.window.document.getElementById('quiz-view')?.textContent).toContain('Готово');
    } finally {
      dom.window.close();
    }
  });
});
