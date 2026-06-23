import type { VideoLockState, DesignSettings } from './types';
import { sanitizeAssetUrl } from './sanitize';

// ===== MEDIA STATE =====

let bgAudio: HTMLAudioElement | null = null;
let bgWasPlayingBeforeVideo = false;
let nodeAudio: HTMLAudioElement | null = null;
let systemSounds: HTMLAudioElement[] = [];
let audioUnlocked = false;
let rutubeOnMessage: ((ev: MessageEvent) => void) | null = null;

export const videoLock: VideoLockState = {
  controlsElement: null,
  overlayElement: null,
  unlockTimer: null,
  manualUnlockTimer: null,
  isLocked: false,
  iframeWindow: null,
  iframeOrigin: null,
};

// ===== AUDIO =====

function unlockAudioContext(): void {
  if (audioUnlocked) return;
  audioUnlocked = true;
  if (bgAudio) bgAudio.play().catch(() => {});
  document.removeEventListener('click', unlockAudioContext);
  document.removeEventListener('keydown', unlockAudioContext);
}

export function safePlayAudio(audio: HTMLAudioElement | null): void {
  if (!audio) return;
  const p = audio.play();
  if (p?.catch) {
    p.catch(() => {
      if (!audioUnlocked) {
        document.addEventListener('click', unlockAudioContext, { once: true });
        document.addEventListener('keydown', unlockAudioContext, { once: true });
      }
    });
  }
}

export function setupBackgroundMusic(ds: DesignSettings | undefined): void {
  if (!ds?.sound?.backgroundMusic) return;
  const url = sanitizeAssetUrl(ds.sound.backgroundMusic);
  if (!url || (bgAudio && bgAudio.src === url)) return;

  if (bgAudio) { bgAudio.pause(); bgAudio = null; }

  bgAudio = new Audio(url);
  bgAudio.loop = true;
  const vol = ds.sound.volume ?? 0.5;
  bgAudio.volume = vol * 0.3;
  safePlayAudio(bgAudio);
}

export function pauseBgMusic(): void {
  if (!bgAudio) return;
  bgWasPlayingBeforeVideo = !bgAudio.paused;
  if (bgWasPlayingBeforeVideo) bgAudio.pause();
}

export function resumeBgMusic(): void {
  if (!bgAudio || !bgWasPlayingBeforeVideo) return;
  bgWasPlayingBeforeVideo = false;
  safePlayAudio(bgAudio);
}

export function stopNodeAudio(): void {
  if (nodeAudio) { nodeAudio.pause(); nodeAudio = null; }
  systemSounds.forEach(a => a?.pause());
  systemSounds = [];
}

export function playNodeEntrySound(url: string | undefined): void {
  if (!url) return;
  const safe = sanitizeAssetUrl(url);
  if (!safe) return;
  nodeAudio = new Audio(safe);
  safePlayAudio(nodeAudio);
}

export function playSound(
  type: 'click' | 'correctAnswer' | 'incorrectAnswer' | 'achievement',
  ds: DesignSettings | undefined,
  overrideUrl?: string,
): void {
  let src = overrideUrl;
  const snd = ds?.sound;
  if (!src && snd) {
    const map: Record<string, string | undefined> = {
      click: snd.buttonClick,
      correctAnswer: snd.correctAnswer,
      incorrectAnswer: snd.incorrectAnswer,
      achievement: snd.achievementUnlock,
    };
    src = map[type];
  }
  const safe = sanitizeAssetUrl(src);
  if (!safe) return;
  const audio = new Audio(safe);
  audio.volume = snd?.volume ?? 0.5;
  safePlayAudio(audio);
  systemSounds.push(audio);
}

// ===== VIDEO LOCK =====

export function resetVideoLock(): void {
  if (videoLock.unlockTimer) clearTimeout(videoLock.unlockTimer);
  if (videoLock.manualUnlockTimer) clearTimeout(videoLock.manualUnlockTimer);
  videoLock.unlockTimer = null;
  videoLock.manualUnlockTimer = null;
  videoLock.isLocked = false;
  videoLock.iframeWindow = null;
  videoLock.iframeOrigin = null;
}

export function unlockVideoControls(): void {
  if (!videoLock.isLocked) return;

  const c = videoLock.controlsElement
    ?? document.getElementById('quiz-controls-container');
  const o = videoLock.overlayElement;

  if (c) c.classList.remove('locked-controls');
  if (o) {
    o.style.transition = 'opacity 0.5s';
    o.style.opacity = '0';
    setTimeout(() => o.parentNode?.removeChild(o), 500);
  }

  resetVideoLock();
  resumeBgMusic();
  cleanupRutubeListener();
}

export function cleanupRutubeListener(): void {
  if (rutubeOnMessage) {
    window.removeEventListener('message', rutubeOnMessage);
    rutubeOnMessage = null;
  }
}

export function setupRutubeListener(): void {
  cleanupRutubeListener();

  rutubeOnMessage = (ev: MessageEvent) => {
    try {
      // Пустой origin — отклоняем (data: URI, sandboxed iframe)
      if (!ev.origin) return;

      if (videoLock.iframeWindow && ev.source !== videoLock.iframeWindow) return;

      const allowed = ['https://rutube.ru', 'https://www.rutube.ru'];
      if (videoLock.iframeOrigin) allowed.push(videoLock.iframeOrigin);
      if (!allowed.includes(ev.origin)) return;

      let d = ev.data;
      if (typeof d === 'string') {
        try { d = JSON.parse(d); } catch { return; }
      }
      if (!d) return;

      const isEnded = d.type === 'player:ended'
        || d.event === 'ended'
        || d.data?.state === 'ended';

      if (isEnded) { unlockVideoControls(); return; }

      if (d.type === 'player:currentTime' || d.type === 'player:progress') {
        const ct = d.data?.currentTime ?? d.currentTime;
        const dur = d.data?.duration ?? d.duration;
        if (dur > 0 && ct > 0 && ct / dur >= 0.96) unlockVideoControls();
      }
    } catch { /* silence */ }
  };

  window.addEventListener('message', rutubeOnMessage);
}

export function cleanupAllMedia(): void {
  stopNodeAudio();
  cleanupRutubeListener();
  if (videoLock.isLocked) unlockVideoControls();
}

// ===== RUTUBE ID =====

const RUTUBE_RE = /^https?:\/\/(?:www\.)?rutube\.ru\/(?:video|play\/embed)\/([a-zA-Z0-9]+)/;

export function getRutubeId(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(RUTUBE_RE);
  return m ? m[1] : null;
}