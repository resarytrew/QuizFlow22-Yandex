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
  'army', 'science', 'math', 'history', 'newyear', 'screenQuiz',
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

describe('screenQuiz template', () => {
  it('uses node title in the top badge before the default node label', () => {
    const nodes = [
      {
        id: 'start-1',
        type: 'startNode',
        position: { x: 0, y: 0 },
        data: { label: 'Старт' },
      },
      {
        id: 'question-1',
        type: 'questionNode',
        position: { x: 0, y: 100 },
        data: {
          label: 'Новый вопрос',
          title: 'Вопрос № 1',
          question: 'Какой орган человека может восстанавливаться?',
          answers: [
            { id: 'a', text: 'Желудок' },
            { id: 'b', text: 'Легкие' },
            { id: 'c', text: 'Печень' },
          ],
        },
      },
    ];

    const html = generateQuizHtmlProgrammatically(
      nodes, [{ id: 'edge-1', source: 'start-1', target: 'question-1' }],
      { enabled: false, duration: 0, onTimeoutNodeId: null },
      {},
      'screen-quiz-title-test',
      'screenQuiz',
      'Screen Quiz'
    );

    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'http://localhost/',
      pretendToBeVisual: true,
    });

    expect(dom.window.document.querySelector('#sq-badge')?.textContent).toBe('Вопрос № 1');
    expect(dom.window.document.querySelector('.sq-title')?.textContent).toBe('Какой орган человека может восстанавливаться?');
    dom.window.close();
  });

  it('renders answer images as image grid choices', () => {
    const nodes = [
      {
        id: 'question-1',
        type: 'questionNode',
        position: { x: 0, y: 100 },
        data: {
          label: 'Новый вопрос',
          question: 'Выберите орган',
          answers: [
            { id: 'a', text: 'Сердце', imageUrl: 'https://example.com/heart.png' },
            { id: 'b', text: 'Легкие', imageUrl: 'https://example.com/lungs.png' },
          ],
        },
      },
    ];

    const html = generateQuizHtmlProgrammatically(
      nodes, [],
      { enabled: false, duration: 0, onTimeoutNodeId: null },
      { screenQuiz: { layout: 'image-grid' } },
      'screen-quiz-answer-image-test',
      'screenQuiz',
      'Screen Quiz'
    );

    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'http://localhost/',
      pretendToBeVisual: true,
    });

    const cards = dom.window.document.querySelectorAll('.sq-choice-card');
    const images = dom.window.document.querySelectorAll('.sq-choice-card img');
    expect(cards).toHaveLength(2);
    expect(images[0]?.getAttribute('src')).toBe('https://example.com/heart.png');
    expect(images[1]?.getAttribute('src')).toBe('https://example.com/lungs.png');
    dom.window.close();
  });

  it('renders media library videos as muted autoplay media cards', () => {
    const nodes = [
      {
        id: 'question-video',
        type: 'questionNode',
        position: { x: 0, y: 100 },
        data: {
          question: 'Посмотрите видео и выберите ответ',
          videoUrl: 'https://cdn.example.com/media/question.mp4',
          imageUrl: 'https://cdn.example.com/media/poster.jpg',
          answers: [
            { id: 'a', text: 'Первый', isCorrect: true },
            { id: 'b', text: 'Второй' },
          ],
        },
      },
    ];

    const html = generateQuizHtmlProgrammatically(
      nodes, [],
      { enabled: false, duration: 0, onTimeoutNodeId: null },
      { screenQuiz: { layout: 'media-right', introEnabled: false } },
      'screen-quiz-native-video-test',
      'screenQuiz',
      'Screen Quiz'
    );

    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'http://localhost/',
      pretendToBeVisual: true,
    });

    const mediaCard = dom.window.document.querySelector('.sq-media-card');
    const video = dom.window.document.querySelector('.sq-media-card video') as HTMLVideoElement | null;
    expect(mediaCard?.classList.contains('is-video')).toBe(true);
    expect(video?.getAttribute('src')).toBe('https://cdn.example.com/media/question.mp4');
    expect(video?.getAttribute('poster')).toBe('https://cdn.example.com/media/poster.jpg');
    expect(video?.hasAttribute('muted')).toBe(true);
    expect(video?.hasAttribute('autoplay')).toBe(true);
    expect(video?.hasAttribute('playsinline')).toBe(true);
    expect(video?.controls).toBe(true);
    expect(dom.window.document.querySelector('.sq-media-card img')).toBeNull();
    dom.window.close();
  });

  it('renders story videos with the native muted player', () => {
    const nodes = [
      {
        id: 'info-video',
        type: 'infoNode',
        position: { x: 0, y: 100 },
        data: {
          title: 'Видео-пояснение',
          description: 'Посмотрите короткий фрагмент перед следующим вопросом.',
          videoUrl: 'https://cdn.example.com/media/info.webm',
          imageUrl: 'https://cdn.example.com/media/info-poster.jpg',
        },
      },
    ];

    const html = generateQuizHtmlProgrammatically(
      nodes, [],
      { enabled: false, duration: 0, onTimeoutNodeId: null },
      { screenQuiz: { introEnabled: false } },
      'screen-quiz-story-native-video-test',
      'screenQuiz',
      'Screen Quiz'
    );

    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'http://localhost/',
      pretendToBeVisual: true,
    });

    const storyMedia = dom.window.document.querySelector('.sq-story-media');
    const video = dom.window.document.querySelector('.sq-story-media video') as HTMLVideoElement | null;
    expect(storyMedia?.classList.contains('is-video')).toBe(true);
    expect(video?.getAttribute('src')).toBe('https://cdn.example.com/media/info.webm');
    expect(video?.getAttribute('poster')).toBe('https://cdn.example.com/media/info-poster.jpg');
    expect(video?.hasAttribute('muted')).toBe(true);
    expect(video?.hasAttribute('autoplay')).toBe(true);
    expect(video?.controls).toBe(true);
    expect(dom.window.document.querySelector('.sq-story-media iframe')).toBeNull();
    dom.window.close();
  });

  it('plays screen quiz background, intro, node entry, and voiceover audio cues', async () => {
    const playedAudio: Array<{ src: string; volume: number }> = [];

    const nodes = [
      {
        id: 'question-audio',
        type: 'questionNode',
        position: { x: 0, y: 100 },
        data: {
          question: 'Вопрос со звуковым оформлением',
          soundSettings: {
            onEntry: 'https://cdn.example.com/audio/entry.mp3',
            voiceover: 'https://cdn.example.com/audio/voiceover.mp3',
          },
          answers: [
            { id: 'a', text: 'Первый', isCorrect: true },
            { id: 'b', text: 'Второй' },
          ],
        },
      },
    ];

    const html = generateQuizHtmlProgrammatically(
      nodes, [],
      { enabled: false, duration: 0, onTimeoutNodeId: null },
      {
        sound: {
          volume: 0.8,
          musicVolume: 0.25,
          voiceVolume: 0.7,
          sfxVolume: 0.5,
          tickVolume: 0.1,
          backgroundMusic: 'https://cdn.example.com/audio/bg.mp3',
          screenQuizIntro: 'https://cdn.example.com/audio/intro.mp3',
          screenQuizTick: 'https://cdn.example.com/audio/tick.mp3',
        },
        screenQuiz: { timerSeconds: 5, introEnabled: false },
      },
      'screen-quiz-audio-test',
      'screenQuiz',
      'Screen Quiz'
    );

    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'http://localhost/',
      pretendToBeVisual: true,
      beforeParse(window: Window) {
        class MockAudio {
          src: string;
          loop = false;
          preload = '';
          volume = 1;
          listeners: Record<string, Array<() => void>> = {};

          constructor(src = '') {
            this.src = src;
          }

          play() {
            playedAudio.push({ src: this.src, volume: this.volume });
            if (this.src.includes('voiceover')) {
              setTimeout(() => {
                this.listeners.ended?.forEach((listener) => listener());
              }, 20);
            }
            return Promise.resolve();
          }

          pause() {}
          addEventListener(type: string, listener: () => void) {
            this.listeners[type] = [...(this.listeners[type] || []), listener];
          }
        }

        Object.defineProperty(window, 'Audio', {
          configurable: true,
          value: MockAudio,
        });
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 220));

    expect(playedAudio.map((item) => item.src)).toContain('https://cdn.example.com/audio/bg.mp3');
    expect(playedAudio.map((item) => item.src)).toContain('https://cdn.example.com/audio/intro.mp3');
    expect(playedAudio.map((item) => item.src)).toContain('https://cdn.example.com/audio/entry.mp3');
    expect(playedAudio.map((item) => item.src)).toContain('https://cdn.example.com/audio/voiceover.mp3');
    expect(playedAudio.map((item) => item.src)).toContain('https://cdn.example.com/audio/tick.mp3');
    expect(playedAudio.find((item) => item.src.includes('bg'))?.volume).toBeCloseTo(0.2);
    expect(playedAudio.find((item) => item.src.includes('voiceover'))?.volume).toBeCloseTo(0.56);
    expect(playedAudio.find((item) => item.src.includes('intro'))?.volume).toBeCloseTo(0.4);
    expect(playedAudio.find((item) => item.src.includes('tick'))?.volume).toBeCloseTo(0.08);
    dom.window.close();
  });

  it('waits for the explicit recording start button before screen quiz playback', async () => {
    const playedUrls: string[] = [];
    const html = generateQuizHtmlProgrammatically(
      [
        {
          id: 'question-recording',
          type: 'questionNode',
          position: { x: 0, y: 100 },
          data: {
            question: 'Старт записи',
            answers: [
              { id: 'a', text: 'A', isCorrect: true },
              { id: 'b', text: 'B' },
            ],
          },
        },
      ],
      [],
      { enabled: false, duration: 0, onTimeoutNodeId: null },
      {
        sound: {
          volume: 0.5,
          backgroundMusic: 'https://cdn.example.com/audio/bg.mp3',
        },
        screenQuiz: { timerSeconds: 5, introEnabled: false },
      },
      'screen-quiz-recording-gate-test',
      'screenQuiz',
      'Screen Quiz'
    );

    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'http://localhost/#screen-quiz-recording',
      pretendToBeVisual: true,
      beforeParse(window: Window) {
        class MockAudio {
          src: string;
          loop = false;
          preload = '';
          volume = 1;

          constructor(src = '') {
            this.src = src;
          }

          play() {
            playedUrls.push(this.src);
            return Promise.resolve();
          }

          pause() {}
          addEventListener() {}
        }

        Object.defineProperty(window, 'Audio', {
          configurable: true,
          value: MockAudio,
        });
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(dom.window.document.querySelector('.sq-recording-gate')).not.toBeNull();
    expect(dom.window.document.querySelector('.sq-content')).toBeNull();
    expect(playedUrls).toEqual([]);

    (dom.window.document.querySelector('.sq-recording-start') as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(dom.window.document.querySelector('.sq-content')).not.toBeNull();
    expect(playedUrls).toContain('https://cdn.example.com/audio/bg.mp3');
    dom.window.close();
  });

  it('applies the configured screen transition effect to the screen quiz shell', () => {
    const nodes = [
      {
        id: 'question-1',
        type: 'questionNode',
        position: { x: 0, y: 100 },
        data: {
          question: 'РџСЂРѕРІРµСЂРєР° РїРµСЂРµС…РѕРґР°',
          answers: [
            { id: 'a', text: 'A', isCorrect: true },
            { id: 'b', text: 'B' },
          ],
        },
      },
    ];

    const html = generateQuizHtmlProgrammatically(
      nodes, [],
      { enabled: false, duration: 0, onTimeoutNodeId: null },
      { screenQuiz: { transitionEffect: 'glitch-cut' } },
      'screen-quiz-transition-effect-test',
      'screenQuiz',
      'Screen Quiz'
    );

    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'http://localhost/',
      pretendToBeVisual: true,
    });

    const root = dom.window.document.querySelector('#screen-quiz-root') as HTMLElement | null;
    expect(root?.getAttribute('data-transition')).toBe('glitch-cut');
    expect(dom.window.document.documentElement.style.getPropertyValue('--sq-transition-duration')).toBe('280ms');
    dom.window.close();
  });

  it('renders info and feedback nodes as premium story scenes', () => {
    const nodes = [
      {
        id: 'info-1',
        type: 'infoNode',
        position: { x: 0, y: 100 },
        data: {
          title: 'Rules',
          description: '- Read the question\n- Wait for the timer\n- Watch the answer reveal',
          imageUrl: 'https://example.com/rules.png',
        },
      },
      {
        id: 'feedback-1',
        type: 'feedbackNode',
        position: { x: 0, y: 260 },
        data: {
          title: 'Answer breakdown',
          message: 'The correct answer is explained here.',
          videoUrl: 'https://cdn.example.com/media/feedback.mp4',
        },
      },
    ];

    const infoHtml = generateQuizHtmlProgrammatically(
      [nodes[0]], [],
      { enabled: false, duration: 0, onTimeoutNodeId: null },
      { screenQuiz: { timerSeconds: 5 } },
      'screen-quiz-info-story-test',
      'screenQuiz',
      'Screen Quiz'
    );

    const infoDom = new JSDOM(infoHtml, {
      runScripts: 'dangerously',
      url: 'http://localhost/',
      pretendToBeVisual: true,
    });

    expect(infoDom.window.document.querySelector('.sq-content')?.classList.contains('story-scene')).toBe(true);
    expect(infoDom.window.document.querySelector('.sq-info-card')).not.toBeNull();
    expect(infoDom.window.document.querySelector('.sq-info-card .sq-story-label')).toBeNull();
    expect(infoDom.window.document.querySelector('.sq-info-card .sq-story-title')).toBeNull();
    expect(infoDom.window.document.querySelectorAll('.sq-story-point')).toHaveLength(3);
    expect(infoDom.window.document.querySelector('.sq-story-media img')?.getAttribute('src')).toBe('https://example.com/rules.png');
    expect(infoDom.window.document.querySelector('.sq-timer')).not.toBeNull();
    infoDom.window.close();

    const feedbackHtml = generateQuizHtmlProgrammatically(
      [nodes[1]], [],
      { enabled: false, duration: 0, onTimeoutNodeId: null },
      { screenQuiz: { timerSeconds: 5, showStoryTimer: false } },
      'screen-quiz-feedback-story-test',
      'screenQuiz',
      'Screen Quiz'
    );

    const feedbackDom = new JSDOM(feedbackHtml, {
      runScripts: 'dangerously',
      url: 'http://localhost/',
      pretendToBeVisual: true,
    });

    expect(feedbackDom.window.document.querySelector('.sq-feedback-card')).not.toBeNull();
    expect(feedbackDom.window.document.querySelector('.sq-feedback-mark')).toBeNull();
    expect(feedbackDom.window.document.querySelector('.sq-feedback-card .sq-story-label')).toBeNull();
    expect(feedbackDom.window.document.querySelector('.sq-feedback-card .sq-story-title')).toBeNull();
    expect(feedbackDom.window.document.querySelector('.sq-story-body')?.textContent).toContain('The correct answer is explained here.');
    const feedbackVideo = feedbackDom.window.document.querySelector('.sq-story-media video') as HTMLVideoElement | null;
    expect(feedbackVideo?.getAttribute('src')).toBe('https://cdn.example.com/media/feedback.mp4');
    expect(feedbackVideo?.hasAttribute('muted')).toBe(true);
    expect(feedbackVideo?.hasAttribute('autoplay')).toBe(true);
    expect(feedbackVideo?.controls).toBe(true);
    expect(feedbackDom.window.document.querySelector('.sq-story-media iframe')).toBeNull();
    expect(feedbackDom.window.document.querySelector('.sq-timer')).toBeNull();
    feedbackDom.window.close();
  });

  it('applies screen quiz layout overrides without changing the global default', () => {
    const baseNode = {
      id: 'question-1',
      type: 'questionNode',
      position: { x: 0, y: 100 },
      data: {
        label: 'Вопрос 1',
        question: 'Выберите изображение',
        answers: [
          { id: 'a', text: 'Первый', imageUrl: 'https://example.com/first.png' },
          { id: 'b', text: 'Второй', imageUrl: 'https://example.com/second.png' },
        ],
      },
    };

    const htmlWithOverride = generateQuizHtmlProgrammatically(
      [
      {
        ...baseNode,
        data: { ...baseNode.data, screenQuiz: { layout: 'image-grid' } },
      },
      ],
      [],
      { enabled: false, duration: 0, onTimeoutNodeId: null },
      { screenQuiz: { layout: 'question-only' } },
      'screen-quiz-node-layout-override-test',
      'screenQuiz',
      'Screen Quiz'
    );

    const domWithOverride = new JSDOM(htmlWithOverride, {
      runScripts: 'dangerously',
      url: 'http://localhost/',
      pretendToBeVisual: true,
    });

    expect(domWithOverride.window.document.querySelector('.sq-content')?.classList.contains('image-grid')).toBe(true);
    domWithOverride.window.close();

    const htmlWithoutOverride = generateQuizHtmlProgrammatically(
      [baseNode],
      [],
      { enabled: false, duration: 0, onTimeoutNodeId: null },
      { screenQuiz: { layout: 'question-only' } },
      'screen-quiz-global-layout-default-test',
      'screenQuiz',
      'Screen Quiz'
    );

    const domWithoutOverride = new JSDOM(htmlWithoutOverride, {
      runScripts: 'dangerously',
      url: 'http://localhost/',
      pretendToBeVisual: true,
    });

    const content = domWithoutOverride.window.document.querySelector('.sq-content');
    expect(content?.classList.contains('image-grid')).toBe(false);
    expect(content?.classList.contains('question-only')).toBe(true);
    domWithoutOverride.window.close();
  });

  it('automatically highlights the configured correct answer after the screen timer', async () => {
    const nodes = [
      {
        id: 'question-1',
        type: 'questionNode',
        position: { x: 0, y: 100 },
        data: {
          label: 'Вопрос 1',
          question: 'Где правильный ответ?',
          answers: [
            { id: 'a', text: 'Неверный' },
            { id: 'b', text: 'Верный', isCorrect: true },
          ],
        },
      },
    ];

    const html = generateQuizHtmlProgrammatically(
      nodes, [],
      { enabled: false, duration: 0, onTimeoutNodeId: null },
      { screenQuiz: { timerSeconds: 5, introEnabled: false } },
      'screen-quiz-correct-answer-highlight-test',
      'screenQuiz',
      'Screen Quiz'
    );

    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'http://localhost/',
      pretendToBeVisual: true,
    });

    const options = dom.window.document.querySelectorAll('.sq-option');
    expect(options[0]?.classList.contains('wrong')).toBe(false);
    expect(options[1]?.classList.contains('correct')).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 5200));

    expect(options[0]?.classList.contains('wrong')).toBe(true);
    expect(options[1]?.classList.contains('correct')).toBe(true);
    dom.window.close();
  }, 8000);

  it('reveals screen quiz question and answers before starting the timer', async () => {
    const nodes = [
      {
        id: 'question-1',
        type: 'questionNode',
        position: { x: 0, y: 100 },
        data: {
          label: 'Вопрос 1',
          question: 'Вопрос для диктора',
          imageUrl: 'https://example.com/question.png',
          answers: [
            { id: 'a', text: 'Первый ответ' },
            { id: 'b', text: 'Второй ответ', isCorrect: true },
          ],
        },
      },
    ];

    const html = generateQuizHtmlProgrammatically(
      nodes, [],
      { enabled: false, duration: 0, onTimeoutNodeId: null },
      {
        screenQuiz: {
          timerSeconds: 5,
          introEnabled: true,
          introTiming: 'manual',
          introQuestionMs: 800,
          introAnswerMs: 600,
          introMediaMs: 1200,
          introGapMs: 0,
        },
      },
      'screen-quiz-intro-before-timer-test',
      'screenQuiz',
      'Screen Quiz'
    );

    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'http://localhost/',
      pretendToBeVisual: true,
    });

    const scene = dom.window.document.querySelector('#sq-scene') as HTMLElement;
    const questionCard = dom.window.document.querySelector('.sq-question-card');
    const mediaCard = dom.window.document.querySelector('.sq-media-card');
    const options = dom.window.document.querySelectorAll('.sq-option');
    expect(scene.getAttribute('data-playback-phase')).toBe('intro');
    expect(options[1]?.classList.contains('correct')).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(questionCard?.classList.contains('is-intro-visible')).toBe(true);
    expect(mediaCard?.classList.contains('is-intro-visible')).toBe(true);
    expect(options[0]?.classList.contains('is-intro-visible')).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 5200));

    expect(scene.getAttribute('data-playback-phase')).toBe('countdown');
    expect(options[1]?.classList.contains('correct')).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 2200));

    expect(scene.getAttribute('data-playback-phase')).toBe('reveal');
    expect(options[0]?.classList.contains('wrong')).toBe(true);
    expect(options[1]?.classList.contains('correct')).toBe(true);
    dom.window.close();
  }, 9000);

  it('uses manual montage timeline hold and reveal segments during screen quiz playback', async () => {
    const nodes = [
      {
        id: 'question-1',
        type: 'questionNode',
        position: { x: 0, y: 100 },
        data: {
          label: 'Вопрос 1',
          question: 'Сцена с ручной монтажной лентой',
          answers: [
            { id: 'a', text: 'Первый ответ' },
            { id: 'b', text: 'Верный ответ', isCorrect: true },
          ],
        },
      },
    ];

    const html = generateQuizHtmlProgrammatically(
      nodes, [],
      { enabled: false, duration: 0, onTimeoutNodeId: null },
      {
        screenQuiz: {
          timelineMode: 'timeline',
          timerSeconds: 5,
          holdSeconds: 0.4,
          revealSeconds: 0.5,
          transitionMs: 80,
          introEnabled: false,
        },
      },
      'screen-quiz-manual-timeline-test',
      'screenQuiz',
      'Screen Quiz'
    );

    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'http://localhost/',
      pretendToBeVisual: true,
    });

    const scene = dom.window.document.querySelector('#sq-scene') as HTMLElement;
    const options = dom.window.document.querySelectorAll('.sq-option');

    await new Promise((resolve) => setTimeout(resolve, 220));
    expect(scene.getAttribute('data-playback-phase')).not.toBe('countdown');

    await new Promise((resolve) => setTimeout(resolve, 520));
    expect(scene.getAttribute('data-playback-phase')).toBe('countdown');

    await new Promise((resolve) => setTimeout(resolve, 5150));
    expect(scene.getAttribute('data-playback-phase')).toBe('reveal');
    expect(options[0]?.classList.contains('wrong')).toBe(true);
    expect(options[1]?.classList.contains('correct')).toBe(true);

    dom.window.close();
  }, 8000);

  it('keeps screen quiz playback on visible screens and skips logic nodes', async () => {
    const nodes = [
      {
        id: 'start-1',
        type: 'startNode',
        position: { x: 0, y: 0 },
        data: { label: 'Старт' },
      },
      {
        id: 'score-1',
        type: 'scoreNode',
        position: { x: 0, y: 100 },
        data: { label: 'Служебная логика', operation: 'add', value: 1 },
      },
      {
        id: 'question-1',
        type: 'questionNode',
        position: { x: 0, y: 200 },
        data: {
          label: 'Экран 1',
          question: 'Первый видимый экран',
          answers: [
            { id: 'true', text: 'Верно', isCorrect: true },
            { id: 'false', text: 'Неверно' },
          ],
        },
      },
      {
        id: 'question-2',
        type: 'questionNode',
        position: { x: 0, y: 320 },
        data: {
          label: 'Экран 2',
          question: 'Следующий видимый экран',
          answers: [
            { id: 'a', text: 'A', isCorrect: true },
            { id: 'b', text: 'B' },
          ],
        },
      },
    ];

    const html = generateQuizHtmlProgrammatically(
      nodes,
      [
        { id: 'edge-start-score', source: 'start-1', target: 'score-1' },
        { id: 'edge-question-score', source: 'question-1', sourceHandle: 'true', target: 'score-1' },
      ],
      { enabled: false, duration: 0, onTimeoutNodeId: null },
      { screenQuiz: { timerSeconds: 5, introEnabled: false } },
      'screen-quiz-skip-logic-test',
      'screenQuiz',
      'Screen Quiz'
    );

    expect(html).toContain('.sq-option.correct::after');
    expect(html).toContain('.sq-content.question-only[data-answer-count="2"] .sq-answers');

    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'http://localhost/',
      pretendToBeVisual: true,
    });

    expect(dom.window.document.querySelector('.sq-title')?.textContent).toBe('Первый видимый экран');

    await new Promise((resolve) => setTimeout(resolve, 7000));

    expect(dom.window.document.querySelector('.sq-title')?.textContent).toBe('Следующий видимый экран');
    dom.window.close();
  }, 9000);

  it('renders multiple choice as a screen quiz with local layout, timer, and multi-answer reveal', async () => {
    const nodes = [
      {
        id: 'multi-1',
        type: 'multipleChoiceNode',
        position: { x: 0, y: 100 },
        data: {
          title: 'Вопрос № 2',
          question: 'Выберите все правильные изображения',
          screenQuiz: { layout: 'image-grid', timerSeconds: 5 },
          correctOptions: ['a', 'c'],
          answers: [
            { id: 'a', text: 'Первый', imageUrl: 'https://example.com/first.png' },
            { id: 'b', text: 'Второй', imageUrl: 'https://example.com/second.png' },
            { id: 'c', text: 'Третий', imageUrl: 'https://example.com/third.png' },
          ],
        },
      },
    ];

    const html = generateQuizHtmlProgrammatically(
      nodes, [],
      { enabled: false, duration: 0, onTimeoutNodeId: null },
      { screenQuiz: { layout: 'question-only', timerSeconds: 30, introEnabled: false } },
      'screen-quiz-multiple-choice-test',
      'screenQuiz',
      'Screen Quiz'
    );

    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'http://localhost/',
      pretendToBeVisual: true,
    });

    const content = dom.window.document.querySelector('.sq-content');
    const cards = dom.window.document.querySelectorAll('.sq-choice-card');
    expect(content?.classList.contains('image-grid')).toBe(true);
    expect(dom.window.document.documentElement.style.getPropertyValue('--sq-duration')).toBe('5s');
    expect(cards).toHaveLength(3);
    expect(cards[0]?.classList.contains('correct')).toBe(false);
    expect(cards[2]?.classList.contains('correct')).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 5800));

    expect(cards[0]?.classList.contains('correct')).toBe(true);
    expect(cards[0]?.getAttribute('style')).toContain('--sq-reveal-order: 0');
    expect(cards[1]?.classList.contains('wrong')).toBe(true);
    expect(cards[2]?.classList.contains('correct')).toBe(true);
    expect(cards[2]?.getAttribute('style')).toContain('--sq-reveal-order: 1');
    dom.window.close();
  }, 8000);
});

