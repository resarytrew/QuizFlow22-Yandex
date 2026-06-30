import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  buildCaptureHintHtml,
  canEncodeSeekableMp4,
  estimateScreenQuizVideoDurationMs,
  hasScreenQuizPlaybackStarted,
  pickSupportedMp4MimeType,
  resolveScreenQuizCaptureAssetUrls,
  sanitizeVideoFileName,
} from './screenQuizVideoExport';

describe('screenQuizVideoExport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sanitizes MP4 filenames for browser downloads', () => {
    expect(sanitizeVideoFileName('  Урок: <Верно/Неверно>?  ')).toBe('Урок- -Верно-Неверно--');
    expect(sanitizeVideoFileName('...')).toBe('screen-quiz');
  });

  it('picks the first MP4 MediaRecorder mime type supported by the browser', () => {
    class MockMediaRecorder {
      static isTypeSupported(mimeType: string) {
        return mimeType === 'video/mp4';
      }
    }

    vi.stubGlobal('MediaRecorder', MockMediaRecorder);

    expect(pickSupportedMp4MimeType()).toBe('video/mp4');
  });

  it('returns null when MP4 MediaRecorder is unavailable', () => {
    vi.stubGlobal('MediaRecorder', undefined);

    expect(pickSupportedMp4MimeType()).toBeNull();
  });

  it('treats unavailable WebCodecs AVC encoding as unsupported for indexed MP4 export', async () => {
    vi.stubGlobal('VideoEncoder', undefined);

    await expect(canEncodeSeekableMp4()).resolves.toBe(false);
  });

  it('builds a CSP-isolated capture hint without scripts', () => {
    const html = buildCaptureHintHtml(1280, 720);

    expect(html).toContain('Content-Security-Policy');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("style-src 'unsafe-inline'");
    expect(html).not.toMatch(/<script[\s>]/i);
  });

  it('uses absolute preview runner urls for blob-backed MP4 capture windows', () => {
    const html = [
      '<html><body>',
      '<script type="module" src="/assets/__quiz_template_runner.js"></script>',
      '<script type="module" src="/assets/__quiz_engine.js"></script>',
      '</body></html>',
    ].join('');

    expect(resolveScreenQuizCaptureAssetUrls(html, 'https://quiz.example')).toContain(
      'src="https://quiz.example/assets/__quiz_template_runner.js"',
    );
    expect(resolveScreenQuizCaptureAssetUrls(html, 'https://quiz.example')).toContain(
      'src="https://quiz.example/assets/__quiz_engine.js"',
    );
  });

  it('detects when the screen quiz scene has actually rendered before recording', () => {
    document.body.innerHTML = '<section id="sq-scene"></section>';
    expect(hasScreenQuizPlaybackStarted(document)).toBe(false);

    document.body.innerHTML = '<section id="sq-scene"><article class="sq-content"></article></section>';
    expect(hasScreenQuizPlaybackStarted(document)).toBe(true);
  });

  it('estimates full screen quiz playback duration from visible nodes only', () => {
    const duration = estimateScreenQuizVideoDurationMs(
      [
        { id: 'start', type: 'startNode', data: {} },
        { id: 'logic', type: 'scoreNode', data: { value: 10 } },
        {
          id: 'q1',
          type: 'questionNode',
          data: {
            screenQuiz: { timerSeconds: 5, transitionEffect: 'glitch-cut' },
            answers: [
              { id: 'true', text: 'Верно', isCorrect: true },
              { id: 'false', text: 'Неверно' },
            ],
          },
        },
        {
          id: 'q2',
          type: 'questionNode',
          data: {
            answers: [
              { id: 'a', text: 'A' },
              { id: 'b', text: 'B', isCorrect: true },
            ],
          },
        },
      ],
      { screenQuiz: { timerSeconds: 7, transitionEffect: 'pixel-dissolve' } },
    );

    expect(duration).toBe(5_000 + 1_180 + 280 + 7_000 + 1_180 + 380 + 900);
  });
});
