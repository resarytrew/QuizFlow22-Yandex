import { describe, it, expect } from "vitest";
import { normalizeLegacyArgs } from "../normalizeInput";
import { DEFAULT_GLOBAL_TIMER, DEFAULT_TEMPLATE_ID } from "../types";

describe("normalizeLegacyArgs", () => {
  // ═══════════════════════════════════════════════════════════════════
  // Object format
  // ═══════════════════════════════════════════════════════════════════

  describe("object format", () => {
    it("extracts all fields from object payload", () => {
      const input = normalizeLegacyArgs([
        {
          nodes: [{ id: "1" }],
          edges: [{ source: "1", target: "2" }],
          globalTimer: { enabled: true, duration: 60, onTimeoutNodeId: "t" },
          designSettings: { background: { color: "#fff" } },
          quizId: "q1",
          templateId: "science",
          currentQuizName: "Test Quiz",
          startNodeId: "start",
        },
      ]);

      expect(input.nodes).toHaveLength(1);
      expect(input.edges).toHaveLength(1);
      expect(input.globalTimer?.enabled).toBe(true);
      expect(input.quizId).toBe("q1");
      expect(input.templateId).toBe("science");
      expect(input.currentQuizName).toBe("Test Quiz");
      expect(input.startNodeId).toBe("start");
    });

    it("uses 'name' as fallback for currentQuizName", () => {
      const input = normalizeLegacyArgs([
        { nodes: [], edges: [], name: "Fallback Name" },
      ]);
      expect(input.currentQuizName).toBe("Fallback Name");
    });

    it("provides defaults for missing optional fields", () => {
      const input = normalizeLegacyArgs([{ nodes: [], edges: [] }]);

      expect(input.globalTimer).toEqual(DEFAULT_GLOBAL_TIMER);
      expect(input.designSettings).toBeUndefined();
      expect(input.quizId).toBeNull();
      expect(input.templateId).toBe(DEFAULT_TEMPLATE_ID);
      expect(input.currentQuizName).toBe("");
      expect(input.startNodeId).toBeUndefined();
    });

    it("handles null quizId", () => {
      const input = normalizeLegacyArgs([
        { nodes: [], edges: [], quizId: null },
      ]);
      expect(input.quizId).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Positional format
  // ═══════════════════════════════════════════════════════════════════

  describe("positional format", () => {
    it("extracts nodes and edges from first two args", () => {
      const nodes = [{ id: "1" }];
      const edges = [{ source: "1", target: "2" }];
      const input = normalizeLegacyArgs([nodes, edges]);

      expect(input.nodes).toBe(nodes);
      expect(input.edges).toBe(edges);
    });

    it("extracts all 8 positional args", () => {
      const input = normalizeLegacyArgs([
        [{ id: "1" }],         // nodes
        [],                     // edges
        { enabled: true, duration: 30, onTimeoutNodeId: null }, // timer
        { background: {} },    // designSettings
        "q1",                  // quizId
        "army",                // templateId
        "My Quiz",             // currentQuizName
        "start-1",             // startNodeId
      ]);

      expect(input.nodes).toHaveLength(1);
      expect(input.globalTimer?.enabled).toBe(true);
      expect(input.quizId).toBe("q1");
      expect(input.templateId).toBe("army");
      expect(input.currentQuizName).toBe("My Quiz");
      expect(input.startNodeId).toBe("start-1");
    });

    it("provides defaults when args are missing", () => {
      const input = normalizeLegacyArgs([]);
      expect(input.nodes).toEqual([]);
      expect(input.edges).toEqual([]);
      expect(input.templateId).toBe(DEFAULT_TEMPLATE_ID);
    });

    it("coerces non-array nodes to empty array", () => {
      const input = normalizeLegacyArgs(["not an array", []]);
      expect(input.nodes).toEqual([]);
    });

    it("coerces numeric quizId to string", () => {
      const input = normalizeLegacyArgs([[], [], undefined, undefined, 42]);
      expect(input.quizId).toBe("42");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Edge cases
  // ═══════════════════════════════════════════════════════════════════

  describe("edge cases", () => {
    it("handles empty args", () => {
      const input = normalizeLegacyArgs([]);
      expect(input.nodes).toEqual([]);
      expect(input.edges).toEqual([]);
    });

    it("does not treat array as object payload", () => {
      // Single arg that is an array → positional format (arg[0] = nodes)
      const input = normalizeLegacyArgs([[{ id: "1" }]]);
      // This is positional: nodes = [{id:'1'}], rest = defaults
      expect(input.nodes).toEqual([{ id: "1" }]);
    });

    it("handles globalTimer with missing fields", () => {
      const input = normalizeLegacyArgs([
        { nodes: [], edges: [], globalTimer: { enabled: true } },
      ]);
      expect(input.globalTimer?.duration).toBe(0);
      expect(input.globalTimer?.onTimeoutNodeId).toBeNull();
    });

    it("coerces boolean globalTimer.enabled", () => {
      const input = normalizeLegacyArgs([
        { nodes: [], edges: [], globalTimer: { enabled: 1 } },
      ]);
      expect(input.globalTimer?.enabled).toBe(true);
    });

    it("ignores unknown templateId and defaults", () => {
      const input = normalizeLegacyArgs([
        { nodes: [], edges: [], templateId: "" },
      ]);
      expect(input.templateId).toBe(DEFAULT_TEMPLATE_ID);
    });
  });
});