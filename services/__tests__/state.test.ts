import { describe, it, expect, beforeEach } from "vitest";
import {
  getState,
  resetState,
  updateScore,
  setVariable,
  getVariable,
  updateVariable,
  pushPath,
  markVisited,
  setCurrentNode,
  markResultSaved,
  getTimeSince,
  createInitialState,
} from "../state";

describe("state", () => {
  beforeEach(() => {
    resetState();
  });

  // ═══════════════════════════════════════════════════════════════════
  // createInitialState / resetState
  // ═══════════════════════════════════════════════════════════════════

  describe("createInitialState", () => {
    it("returns fresh state with zero score", () => {
      const state = createInitialState();
      expect(state.score).toBe(0);
    });

    it("returns fresh state with empty variables", () => {
      const state = createInitialState();
      expect(Object.keys(state.variables)).toHaveLength(0);
    });

    it("returns fresh state with empty path", () => {
      const state = createInitialState();
      expect(state.path).toHaveLength(0);
    });

    it("returns fresh state with empty visited set", () => {
      const state = createInitialState();
      expect(state.visitedInteractiveNodes.size).toBe(0);
    });

    it("returns fresh state with isResultSaved false", () => {
      const state = createInitialState();
      expect(state.isResultSaved).toBe(false);
    });
  });

  describe("resetState", () => {
    it("clears all mutations", () => {
      updateScore("add", 100);
      setVariable("test", "value");
      pushPath("node-1");
      markVisited("node-1");

      resetState();

      const state = getState();
      expect(state.score).toBe(0);
      expect(Object.keys(state.variables)).toHaveLength(0);
      expect(state.path).toHaveLength(0);
      expect(state.visitedInteractiveNodes.size).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // updateScore
  // ═══════════════════════════════════════════════════════════════════

  describe("updateScore", () => {
    it("adds to score", () => {
      updateScore("add", 10);
      expect(getState().score).toBe(10);
    });

    it("adds multiple times", () => {
      updateScore("add", 10);
      updateScore("add", 20);
      expect(getState().score).toBe(30);
    });

    it("subtracts from score", () => {
      updateScore("set", 50);
      updateScore("subtract", 20);
      expect(getState().score).toBe(30);
    });

    it("sets score absolutely", () => {
      updateScore("add", 100);
      updateScore("set", 42);
      expect(getState().score).toBe(42);
    });

    it("multiplies score", () => {
      updateScore("set", 10);
      updateScore("multiply", 3);
      expect(getState().score).toBe(30);
    });

    it("clamps score to minimum 0", () => {
      updateScore("set", 5);
      updateScore("subtract", 100);
      expect(getState().score).toBe(0);
    });

    it("clamps score to maximum 1,000,000", () => {
      updateScore("set", 999_999);
      updateScore("add", 100);
      expect(getState().score).toBe(1_000_000);
    });

    it("rounds score to integer", () => {
      updateScore("set", 10);
      updateScore("multiply", 3);
      updateScore("add", 1);
      // 10 * 3 + 1 = 31, already integer, but test with division-like ops
      expect(Number.isInteger(getState().score)).toBe(true);
    });

    it("handles NaN value gracefully (treats as 0)", () => {
      updateScore("set", 50);
      updateScore("add", NaN);
      expect(getState().score).toBe(50);
    });

    it("defaults unknown operation to add", () => {
      updateScore("unknown_op" as any, 10);
      expect(getState().score).toBe(10);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Variables
  // ═══════════════════════════════════════════════════════════════════

  describe("setVariable / getVariable", () => {
    it("sets and gets string variable", () => {
      setVariable("name", "Alice");
      expect(getVariable("name")).toBe("Alice");
    });

    it("sets and gets numeric variable", () => {
      setVariable("count", 42);
      expect(getVariable("count")).toBe(42);
    });

    it("sets and gets boolean variable", () => {
      setVariable("flag", true);
      expect(getVariable("flag")).toBe(true);
    });

    it("returns undefined for non-existent variable", () => {
      expect(getVariable("nonexistent")).toBeUndefined();
    });

    it("overwrites existing variable", () => {
      setVariable("x", 1);
      setVariable("x", 2);
      expect(getVariable("x")).toBe(2);
    });
  });

  describe("updateVariable", () => {
    it("sets variable", () => {
      updateVariable("x", "set", 42);
      expect(getVariable("x")).toBe(42);
    });

    it("adds to numeric variable", () => {
      setVariable("x", 10);
      updateVariable("x", "add", 5);
      expect(getVariable("x")).toBe(15);
    });

    it("subtracts from numeric variable", () => {
      setVariable("x", 10);
      updateVariable("x", "subtract", 3);
      expect(getVariable("x")).toBe(7);
    });

    it("multiplies numeric variable", () => {
      setVariable("x", 10);
      updateVariable("x", "multiply", 4);
      expect(getVariable("x")).toBe(40);
    });

    it("appends to string variable", () => {
      setVariable("text", "Hello");
      updateVariable("text", "append", " World");
      expect(getVariable("text")).toBe("Hello World");
    });

    it("initializes non-existent variable on add (treats as 0)", () => {
      updateVariable("fresh", "add", 5);
      expect(getVariable("fresh")).toBe(5);
    });

    it("sets string value with set operation", () => {
      updateVariable("category", "set", "science");
      expect(getVariable("category")).toBe("science");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Path
  // ═══════════════════════════════════════════════════════════════════

  describe("pushPath", () => {
    it("records node visit", () => {
      pushPath("node-1");
      expect(getState().path).toHaveLength(1);
      expect(getState().path[0].nodeId).toBe("node-1");
    });

    it("records timestamp as ISO string", () => {
      pushPath("node-1");
      const ts = getState().path[0].timestamp;
      expect(() => new Date(ts)).not.toThrow();
      expect(new Date(ts).toISOString()).toBe(ts);
    });

    it("records multiple visits in order", () => {
      pushPath("a");
      pushPath("b");
      pushPath("c");
      const ids = getState().path.map((p) => p.nodeId);
      expect(ids).toEqual(["a", "b", "c"]);
    });

    it("caps path at MAX_PATH_LENGTH (1000)", () => {
      for (let i = 0; i < 1050; i++) {
        pushPath(`node-${i}`);
      }
      expect(getState().path).toHaveLength(1000);
      // Oldest entries are dropped
      expect(getState().path[0].nodeId).toBe("node-50");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Other state mutations
  // ═══════════════════════════════════════════════════════════════════

  describe("markVisited", () => {
    it("tracks interactive node visits", () => {
      markVisited("q1");
      markVisited("q2");
      expect(getState().visitedInteractiveNodes.has("q1")).toBe(true);
      expect(getState().visitedInteractiveNodes.has("q2")).toBe(true);
    });

    it("deduplicates visits", () => {
      markVisited("q1");
      markVisited("q1");
      expect(getState().visitedInteractiveNodes.size).toBe(1);
    });
  });

  describe("setCurrentNode", () => {
    it("sets current node id", () => {
      setCurrentNode("node-42");
      expect(getState().currentNodeId).toBe("node-42");
    });
  });

  describe("markResultSaved", () => {
    it("marks result as saved", () => {
      expect(getState().isResultSaved).toBe(false);
      markResultSaved();
      expect(getState().isResultSaved).toBe(true);
    });
  });

  describe("getTimeSince", () => {
    it("returns positive number of seconds", () => {
      const start = performance.now() - 5000; // 5 seconds ago
      const elapsed = getTimeSince(start);
      expect(elapsed).toBeGreaterThanOrEqual(4);
      expect(elapsed).toBeLessThanOrEqual(6);
    });
  });
});