type QuizNodeLike = {
  id?: string;
  type?: string;
  data?: unknown;
};

type ScreenQuizDesignLike = {
  screenQuiz?: unknown;
};

const UTILITY_NODE_TYPES = new Set([
  'startNode',
  'scoreNode',
  'variableNode',
  'conditionNode',
  'formulaNode',
  'goToNode',
  'progressionNode',
  'achievementNode',
]);

const MP4_MIME_TYPES = [
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4;codecs=h264',
  'video/mp4',
];

const VIDEO_FRAME_RATE = 30;
const VIDEO_BITRATE = 7_500_000;

type MediabunnyModule = typeof import('mediabunny');

export interface ScreenQuizVideoExportOptions {
  readonly htmlContent: string;
  readonly fileName: string;
  readonly durationMs: number;
  readonly width?: number;
  readonly height?: number;
}

export function sanitizeVideoFileName(value: string): string {
  const normalized = value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/g, '')
    .slice(0, 80);

  return normalized || 'screen-quiz';
}

export function pickSupportedMp4MimeType(): string | null {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return null;
  }

  return MP4_MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || null;
}

export async function canEncodeSeekableMp4(width = 1280, height = 720): Promise<boolean> {
  try {
    const { canEncodeVideo } = await loadMediabunny();
    return await canEncodeVideo('avc', {
      width,
      height,
      bitrate: VIDEO_BITRATE,
    });
  } catch {
    return false;
  }
}

export function estimateScreenQuizVideoDurationMs(
  nodes: ReadonlyArray<QuizNodeLike>,
  designSettings?: ScreenQuizDesignLike,
): number {
  const visibleNodes = nodes.filter((node) => !UTILITY_NODE_TYPES.has(String(node.type || '')));
  const globalSettings = isPlainObject(designSettings?.screenQuiz) ? designSettings.screenQuiz : {};

  if (visibleNodes.length === 0) return 6000;

  const total = visibleNodes.reduce((sum, node) => {
    const data = isPlainObject(node.data) ? node.data : {};
    const localSettings = isPlainObject(data.screenQuiz) ? data.screenQuiz : {};
    const settings = { ...globalSettings, ...localSettings };
    const answers = normalizeAnswers(data);
    const correctCount = answers.filter((answer) => isCorrectAnswer(answer, data)).length;
    const revealDelay = answers.length > 0 ? Math.min(1900, 1180 + Math.max(0, correctCount - 1) * 180) : 120;

    return sum + getTimerMs(settings) + revealDelay + getTransitionMs(settings);
  }, 0);

  return Math.max(4000, total + 900);
}

export async function exportScreenQuizToMp4({
  htmlContent,
  fileName,
  durationMs,
  width = 1280,
  height = 720,
}: ScreenQuizVideoExportOptions): Promise<void> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Браузер не поддерживает захват окна для экспорта видео.');
  }

  if (!(await canEncodeSeekableMp4(width, height))) {
    throw new Error('Браузер не поддерживает совместимую MP4-запись H.264 через WebCodecs. Откройте редактор в последнем Chrome или Edge.');
  }

  const blobUrls: string[] = [];
  const hintUrl = createHtmlBlobUrl(buildCaptureHintHtml(width, height));
  blobUrls.push(hintUrl);
  const popup = window.open(
    hintUrl,
    'screen-quiz-mp4-export',
    `popup=yes,width=${width},height=${height},left=120,top=80`,
  );

  if (!popup) {
    throw new Error('Браузер заблокировал окно экспорта. Разрешите всплывающие окна и повторите экспорт.');
  }

  let stream: MediaStream | null = null;
  try {
    await waitForPopupLoad(popup);
    popup.focus();

    stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: VIDEO_FRAME_RATE, max: VIDEO_FRAME_RATE },
      },
      audio: false,
    });

    const quizUrl = createHtmlBlobUrl(resolveScreenQuizCaptureAssetUrls(htmlContent));
    blobUrls.push(quizUrl);
    popup.location.replace(quizUrl);
    popup.focus();
    await waitForPopupLoad(popup);
    await waitForScreenQuizPlaybackStart(popup);
    await wait(150);

    const blob = await recordSeekableMp4(stream, durationMs, width, height);
    downloadBlob(blob, `${sanitizeVideoFileName(fileName)}.mp4`);
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
    if (!popup.closed) popup.close();
    blobUrls.forEach((url) => URL.revokeObjectURL(url));
  }
}

async function recordSeekableMp4(
  stream: MediaStream,
  durationMs: number,
  width: number,
  height: number,
): Promise<Blob> {
  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack) {
    throw new Error('В выбранном окне нет видеопотока для MP4-экспорта.');
  }

  const {
    BufferTarget,
    CanvasSource,
    Mp4OutputFormat,
    Output,
    QUALITY_HIGH,
  } = await loadMediabunny();
  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target,
  });
  const captureVideo = await createCaptureVideoElement(stream);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    cleanupCaptureVideo(captureVideo);
    throw new Error('Canvas is unavailable for MP4 export.');
  }

  const source = new CanvasSource(canvas, {
    codec: 'avc',
    bitrate: QUALITY_HIGH,
    keyFrameInterval: 1,
  });

  output.addVideoTrack(source, {
    frameRate: VIDEO_FRAME_RATE,
    name: 'Экранная викторина',
  });

  try {
    await output.start();
    await addCanvasFrames({
      source,
      stream,
      video: captureVideo,
      context,
      width,
      height,
      durationMs,
    });
    await output.finalize();
  } finally {
    cleanupCaptureVideo(captureVideo);
  }

  if (!target.buffer) {
    throw new Error('Не удалось финализировать MP4-файл.');
  }

  return new Blob([target.buffer], { type: 'video/mp4' });
}

async function addCanvasFrames({
  source,
  stream,
  video,
  context,
  width,
  height,
  durationMs,
}: {
  source: InstanceType<MediabunnyModule['CanvasSource']>;
  stream: MediaStream;
  video: HTMLVideoElement;
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  durationMs: number;
}): Promise<void> {
  const frameDurationSeconds = 1 / VIDEO_FRAME_RATE;
  const totalFrames = Math.max(1, Math.ceil((durationMs / 1000) * VIDEO_FRAME_RATE));
  const startTime = performance.now();

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
    if (stream.getVideoTracks().every((track) => track.readyState === 'ended')) break;

    const targetTime = startTime + frameIndex * frameDurationSeconds * 1000;
    const delay = targetTime - performance.now();
    if (delay > 0) await wait(delay);

    drawVideoContain(context, video, width, height);
    await source.add(
      frameIndex * frameDurationSeconds,
      frameDurationSeconds,
      { keyFrame: frameIndex % VIDEO_FRAME_RATE === 0 },
    );
  }
}

async function createCaptureVideoElement(stream: MediaStream): Promise<HTMLVideoElement> {
  const video = document.createElement('video');
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.srcObject = stream;
  video.style.position = 'fixed';
  video.style.left = '-10000px';
  video.style.top = '-10000px';
  video.style.width = '1px';
  video.style.height = '1px';
  video.style.opacity = '0';
  video.style.pointerEvents = 'none';
  document.body.appendChild(video);

  await waitForVideoMetadata(video);
  await video.play();
  return video;
}

function cleanupCaptureVideo(video: HTMLVideoElement): void {
  video.pause();
  video.srcObject = null;
  video.remove();
}

function waitForVideoMetadata(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      resolve();
      return;
    }

    let timeoutId = 0;
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      video.removeEventListener('loadedmetadata', handleLoaded);
      video.removeEventListener('error', handleError);
    };
    const handleLoaded = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error('Unable to read the captured video stream.'));
    };

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('Timed out while preparing the captured video stream.'));
    }, 5000);

    video.addEventListener('loadedmetadata', handleLoaded, { once: true });
    video.addEventListener('error', handleError, { once: true });
  });
}

function drawVideoContain(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
): void {
  const sourceWidth = video.videoWidth || width;
  const sourceHeight = video.videoHeight || height;
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const drawWidth = Math.round(sourceWidth * scale);
  const drawHeight = Math.round(sourceHeight * scale);
  const offsetX = Math.floor((width - drawWidth) / 2);
  const offsetY = Math.floor((height - drawHeight) / 2);

  context.fillStyle = '#000000';
  context.fillRect(0, 0, width, height);
  context.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
}

function loadMediabunny(): Promise<MediabunnyModule> {
  return import('mediabunny');
}

export function buildCaptureHintHtml(width: number, height: number): string {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
  <title>Экспорт MP4</title>
  <style>
    html, body { width: 100%; height: 100%; margin: 0; background: #050816; color: #f8fafc; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { display: grid; place-items: center; }
    main { width: min(82vw, ${Math.round(width * 0.7)}px); text-align: center; }
    h1 { margin: 0 0 12px; font-size: clamp(28px, 4vw, 56px); line-height: 1; }
    p { margin: 0 auto; max-width: 620px; color: #cbd5e1; font-size: 18px; line-height: 1.45; }
    .frame { margin-top: 28px; aspect-ratio: ${width} / ${height}; border: 2px solid rgba(148,163,184,.55); border-radius: 24px; display: grid; place-items: center; background: linear-gradient(135deg, rgba(99,102,241,.24), rgba(14,165,233,.16)); }
  </style>
</head>
<body>
  <main>
    <h1>Выберите это окно</h1>
    <p>В системном окне захвата выберите окно с этой надписью. После выбора начнется запись экранной викторины, а совместимый MP4 с нормальной перемоткой скачается автоматически.</p>
    <div class="frame">Окно экспорта ${width}x${height}</div>
  </main>
</body>
</html>`;
}

export function resolveScreenQuizCaptureAssetUrls(
  html: string,
  origin = window.location.origin,
): string {
  return html.replace(
    /(<script\b[^>]*\bsrc=["'])\/(assets\/__(?:quiz_template_runner|quiz_engine)\.js)(["'][^>]*>\s*<\/script>)/gi,
    (_match, before: string, path: string, after: string) => `${before}${new URL(`/${path}`, origin).href}${after}`,
  );
}

export function hasScreenQuizPlaybackStarted(documentRef: Document): boolean {
  const scene = documentRef.querySelector('#sq-scene');
  return Boolean(scene && scene.childElementCount > 0);
}

function createHtmlBlobUrl(html: string): string {
  return URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
}

function waitForPopupLoad(popup: Window): Promise<void> {
  return new Promise((resolve) => {
    if (popup.closed) {
      resolve();
      return;
    }

    try {
      if (popup.document.readyState === 'complete') {
        resolve();
        return;
      }
    } catch {
      resolve();
      return;
    }

    const timeoutId = window.setTimeout(resolve, 1500);
    popup.addEventListener('load', () => {
      window.clearTimeout(timeoutId);
      resolve();
    }, { once: true });
  });
}

async function waitForScreenQuizPlaybackStart(popup: Window): Promise<void> {
  const deadline = performance.now() + 5000;

  while (performance.now() < deadline) {
    if (popup.closed) {
      throw new Error('Окно экспорта было закрыто до запуска экранной викторины.');
    }

    try {
      if (hasScreenQuizPlaybackStarted(popup.document)) return;
    } catch {
      return;
    }

    await wait(80);
  }

  throw new Error('Не удалось запустить экранную викторину в окне экспорта. Обновите страницу и попробуйте снова.');
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function normalizeAnswers(data: Record<string, unknown>): Array<{ id: string; text: string; isCorrect?: boolean }> {
  const raw = Array.isArray(data.answers) ? data.answers : Array.isArray(data.options) ? data.options : [];
  return raw.map((answer, index) => {
    if (typeof answer === 'string') return { id: `a${index}`, text: answer };
    if (!isPlainObject(answer)) return { id: `a${index}`, text: `Ответ ${index + 1}` };

    return {
      id: String(answer.id || answer.value || `a${index}`),
      text: String(answer.text || answer.label || answer.title || answer.value || `Ответ ${index + 1}`),
      isCorrect: typeof answer.isCorrect === 'boolean' ? answer.isCorrect : undefined,
    };
  });
}

function isCorrectAnswer(answer: { id: string; text: string; isCorrect?: boolean }, data: Record<string, unknown>): boolean {
  if (Array.isArray(data.correctOptions)) return data.correctOptions.includes(answer.id);
  if (typeof data.correctAnswer === 'string') return data.correctAnswer === answer.id || data.correctAnswer === answer.text;
  return answer.isCorrect === true;
}

function getTimerMs(settings: Record<string, unknown>): number {
  return clampNumber(settings.timerSeconds, 5, 180, 30) * 1000;
}

function getTransitionMs(settings: Record<string, unknown>): number {
  if (settings.motion === 'off') return 1;
  if (settings.transitionEffect === 'glitch-cut') return 280;
  if (settings.transitionEffect === 'pixel-dissolve') return 380;
  return 340;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(max, Math.max(min, numberValue));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
