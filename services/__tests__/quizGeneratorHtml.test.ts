// @vitest-environment node
// Regression suite for the "quiz fails to load" bug.
//
// Two separate root causes were identified by manual testing and audit:
//
//   1. Four templates (default / ww2 / economic / yandex) were missing
//      the `const quizData = %%QUIZ_DATA_INJECTION%%;` line, so the
//      engine's bare-identifier reference to `quizData` resolved to
//      `ReferenceError: quizData is not defined` the moment the engine
//      IIFE ran. The fix is in quizGenerator.ts: when the template
//      has %%QUIZ_SCRIPT%% but no %%QUIZ_DATA_INJECTION%%, the
//      generator now auto-injects `var quizData = {...}` before
//      </body>.
//
//   2. The engine used `safeCssUrl` (an import from utils/) but the
//      import is lost when the engine is serialised as a string and
//      dropped into inline <script>. The fix inlines a mirror of the
//      function as source code at the top of the IIFE.

import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { generateQuizHtmlProgrammatically } from '../quizGenerator';
import { quizEngineScript } from '../quizEngine';

const TEMPLATE_IDS = [
  'default', 'ww2', 'economic', 'yandex',
  'army', 'science', 'math', 'history', 'newyear',
];

function makeNodes() {
  return [
    {
      id: 'start-1',
      type: 'startNode',
      position: { x: 0, y: 0 },
      data: { label: 'Старт' },
    },
    {
      id: 'text-1',
      type: 'textNode',
      position: { x: 0, y: 100 },
      data: {
        title: 'Привет',
        description: 'Это тестовый квиз',
        buttonText: 'Далее',
      },
    },
  ];
}

describe('Quiz HTML required globals (C-QUIZ-DATA bug)', () => {
  it('engine script is a self-contained IIFE without ESM imports', () => {
    const engineStr = String(quizEngineScript);
    expect(engineStr).not.toMatch(/^\s*import\s/m);
    expect(engineStr).toContain('function');
  });

  it('each template must inject quizData so engine can reference it', () => {
    const failing: string[] = [];
    for (const templateId of TEMPLATE_IDS) {
      try {
        const html = generateQuizHtmlProgrammatically(
          makeNodes(), [],
          { enabled: false, duration: 0, onTimeoutNodeId: null },
          {},
          'test-id',
          templateId as any,
          'Test'
        );
        // Engine reads quizData from one of three sources:
        //   1. `var/let/const quizData = ...` declared in the template
        //   2. <script type="application/json" id="quiz-data">...</script>
        //      (auto-injected by the generator when template has no
        //      %%QUIZ_DATA_INJECTION%% placeholder)
        //   3. window.quizData (legacy fallback)
        const definesQuizDataGlobal = /(?:var|let|const)\s+quizData\s*=/.test(html);
        const definesQuizDataScript = /<script[^>]+id=["']quiz-data["']/.test(html);
        if (!definesQuizDataGlobal && !definesQuizDataScript) failing.push(templateId);
      } catch (e) {
        failing.push(`${templateId} (error: ${(e as Error).message})`);
      }
    }
    expect(failing, `Templates missing quizData injection: ${failing.join(', ')}`).toEqual([]);
  });

  it('generated HTML for the default template must execute the engine without ReferenceError on `quizData`', () => {
    const html = generateQuizHtmlProgrammatically(
      makeNodes(), [],
      { enabled: false, duration: 0, onTimeoutNodeId: null },
      {},
      '00000000-0000-0000-0000-000000000001',
      'default',
      'Test'
    );

    // Strip the CSP meta so JSDOM doesn't reject the inline scripts
    // (jsdom is strict about meta CSP; we only care about the JS).
    //
    // Also strip EXTERNAL <script src=...> tags (Supabase CDN, mathjs CDN,
    // etc.) — with `resources: 'usable'` JSDOM would block subsequent
    // inline scripts until those externals either load or fail, making
    // the test flaky on slow networks. We only care about the engine +
    // data injection, so removing externals is the safe path.
    const stripped = html
      .replace(/<meta[^>]*Content-Security-Policy[^>]*>/gi, '')
      .replace(/<script[^>]*\bsrc=[^>]*><\/script>/gi, '');

    const errors: string[] = [];
    const dom = new JSDOM(stripped, {
      runScripts: 'dangerously',
      url: 'http://localhost/',
      resources: 'usable',
      pretendToBeVisual: true,
      beforeParse(window: any) {
        window.addEventListener('error', (e: any) => {
          errors.push(`${e.message} @ ${e.filename}:${e.lineno}`);
        });
        // jsdom does not implement HTMLDialogElement / etc. — stub
        // anything the engine touches on first paint to be safe.
        window.HTMLDialogElement = window.HTMLDialogElement || class HTMLDialogElement {} as any;
      },
    });

    // Poll for engine init instead of fixed timeout. The engine reads
    // <script id="quiz-data"> on DOMContentLoaded, then sets
    // window.quizData. Poll up to 2s — usually resolves within ~10ms
    // on this host once the externals are stripped.
    const deadline = Date.now() + 2000;
    return new Promise<void>((resolve, reject) => {
      (function tick() {
        const ref = (dom.window as any).quizData;
        if (ref) return resolve();
        if (Date.now() > deadline) return reject(new Error('engine.init never set window.quizData within 2s'));
        setTimeout(tick, 10);
      })();
    }).then(() => {
      const quizDataRef = (dom.window as any).quizData;
      expect(quizDataRef, 'quizData must be set as a global after the injected script runs').toBeDefined();
      expect(quizDataRef.nodes, 'quizData.nodes must be defined').toBeDefined();
      // The generator places the engine <script> BEFORE the
      // <script id="quiz-data"> element, so the engine MUST read the
      // JSON on DOMContentLoaded (not at module-top). If the read worked,
      // window.quizData.nodes should contain the test fixture, not be
      // null/empty.
      expect(quizDataRef.nodes.length, 'quizData.nodes should be non-empty (engine must read from DOM after parsing)').toBeGreaterThan(0);
      expect(quizDataRef.nodes[0].id, 'first node id should match fixture').toBe('start-1');
      expect(errors, 'No uncaught reference errors expected during engine boot').toEqual([]);
      dom.window.close();
    });
  });
});

