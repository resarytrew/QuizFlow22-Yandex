import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveResults,
  sendAbandonmentBeacon,
  setQuizConfig,
} from "../persistence";
import { resetState, updateScore, setVariable, markResultSaved } from "../state";

describe("persistence", () => {
  beforeEach(() => {
    resetState();
    vi.restoreAllMocks();
    setQuizConfig({});
  });

  describe("saveResults", () => {
    it("does not save without quizId", () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
      setQuizConfig({ apiBaseUrl: "https://api.example.com/api" });
      saveResults("Finish");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("does not save without API base URL", () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
      setQuizConfig({ quizId: "q1" });
      saveResults("Finish");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("does not save twice", () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
      setQuizConfig({ quizId: "q1", apiBaseUrl: "https://api.example.com/api" });

      saveResults("Finish");
      saveResults("Finish again");

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("sends result payload to Yandex API", () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
      updateScore("set", 42);
      setVariable("playerName", "Alice");
      setQuizConfig({ quizId: "q1", apiBaseUrl: "https://api.example.com/api/" });

      saveResults("Great Job!");

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api.example.com/api/results");
      expect(options.method).toBe("POST");
      expect(options.keepalive).toBe(true);

      const body = JSON.parse(options.body as string);
      expect(body.quiz_id).toBe("q1");
      expect(body.session_id).toEqual(expect.stringMatching(/^anon_/));
      expect(body.score).toBe(42);
      expect(body.participant_name).toBe("Alice");
      expect(body.final_node_title).toBe("Great Job!");
      expect(body.time_spent_seconds).toEqual(expect.any(Number));
    });

    it("handles fetch error gracefully", () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network"));
      setQuizConfig({ quizId: "q1", apiBaseUrl: "https://api.example.com/api" });
      expect(() => saveResults("End")).not.toThrow();
    });
  });

  describe("sendAbandonmentBeacon", () => {
    it("sends beacon when result is not saved", () => {
      const beaconSpy = vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);
      setQuizConfig({ quizId: "q1", apiBaseUrl: "https://api.example.com/api" });

      sendAbandonmentBeacon();

      expect(beaconSpy).toHaveBeenCalledOnce();
      expect(beaconSpy.mock.calls[0][0]).toBe("https://api.example.com/api/results");
      const body = JSON.parse(beaconSpy.mock.calls[0][1] as string);
      expect(body.session_id).toEqual(expect.stringMatching(/^anon_/));
      expect(body.results_data.abandoned).toBe(true);
      expect(body.time_spent_seconds).toEqual(expect.any(Number));
    });

    it("does not send beacon when result already saved", () => {
      const beaconSpy = vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);
      markResultSaved();
      setQuizConfig({ quizId: "q1", apiBaseUrl: "https://api.example.com/api" });

      sendAbandonmentBeacon();

      expect(beaconSpy).not.toHaveBeenCalled();
    });

    it("does not send beacon without API base URL", () => {
      const beaconSpy = vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);
      setQuizConfig({ quizId: "q1" });
      sendAbandonmentBeacon();
      expect(beaconSpy).not.toHaveBeenCalled();
    });

    it("handles missing sendBeacon gracefully", () => {
      const original = navigator.sendBeacon;
      Object.defineProperty(navigator, "sendBeacon", {
        value: undefined,
        writable: true,
      });

      setQuizConfig({ quizId: "q1", apiBaseUrl: "https://api.example.com/api" });
      expect(() => sendAbandonmentBeacon()).not.toThrow();

      Object.defineProperty(navigator, "sendBeacon", {
        value: original,
        writable: true,
      });
    });
  });
});
