import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getRutubeId,
  safePlayAudio,
  resetVideoLock,
  videoLock,
} from "../media";

const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockPause = vi.fn();

class MockAudio {
  src: string;
  loop = false;
  volume = 1;
  paused = true;
  play = mockPlay;
  pause = mockPause;
  constructor(src: string) {
    this.src = src;
  }
}

vi.stubGlobal("Audio", MockAudio);

describe("media", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetVideoLock();
  });

  describe("getRutubeId", () => {
    it("extracts ID from canonical URL", () => {
      expect(
        getRutubeId("https://rutube.ru/video/abc123def/"),
      ).toBe("abc123def");
    });

    it("extracts ID from embed URL", () => {
      expect(
        getRutubeId("https://rutube.ru/play/embed/xyz789/"),
      ).toBe("xyz789");
    });

    it("extracts ID from www URL", () => {
      expect(
        getRutubeId("https://www.rutube.ru/video/aaa111/"),
      ).toBe("aaa111");
    });

    it("returns null for YouTube URL", () => {
      expect(
        getRutubeId("https://youtube.com/watch?v=abc"),
      ).toBeNull();
    });

    it("returns null for plain text", () => {
      expect(getRutubeId("just some text")).toBeNull();
    });

    it("returns null for undefined", () => {
      expect(getRutubeId(undefined)).toBeNull();
    });

    it("does not match rutube.ru in subdomain of other host (anchored regex)", () => {
      expect(
        getRutubeId("https://evil.com/rutube.ru/video/abc123"),
      ).toBeNull();
    });
  });

  describe("safePlayAudio", () => {
    it("calls play on audio element", () => {
      const audio = new MockAudio("https://example.com/sound.mp3");
      safePlayAudio(audio as unknown as HTMLAudioElement);
      expect(mockPlay).toHaveBeenCalledOnce();
    });

    it("does nothing for null", () => {
      expect(() => safePlayAudio(null)).not.toThrow();
      expect(mockPlay).not.toHaveBeenCalled();
    });

    it("handles rejected play promise gracefully", () => {
      mockPlay.mockRejectedValueOnce(new Error("NotAllowedError"));
      const audio = new MockAudio("https://example.com/sound.mp3");
      expect(() =>
        safePlayAudio(audio as unknown as HTMLAudioElement),
      ).not.toThrow();
    });
  });

  describe("videoLock", () => {
    it("starts unlocked", () => {
      expect(videoLock.isLocked).toBe(false);
    });

    it("resetVideoLock clears state", () => {
      videoLock.isLocked = true;
      videoLock.iframeWindow = {} as Window;
      resetVideoLock();
      expect(videoLock.isLocked).toBe(false);
      expect(videoLock.iframeWindow).toBeNull();
    });
  });
});
