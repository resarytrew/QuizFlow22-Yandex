import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildIndexes,
  type QuizData,
  type QuizNode,
  type QuizEdge,
} from "../indexing";
import { processNode, resolveNextNode, getNextNodeId } from "../navigation";
import { resetState, getState, updateScore } from "../state";

// Мокаем render чтобы не работать с DOM
vi.mock("../render", () => ({
  renderNode: vi.fn(),
  renderError: vi.fn(),
  setDesignSettings: vi.fn(),
}));

vi.mock("../hud", () => ({
  updateHUD: vi.fn(),
}));

vi.mock("../media", () => ({
  playNodeEntrySound: vi.fn(),
  cleanupAllMedia: vi.fn(),
}));

import { renderNode, renderError } from "../render";

function buildQuiz(
  nodes: Partial<QuizNode>[],
  edges: Partial<QuizEdge>[] = [],
) {
  const fullNodes = nodes.map((n) => ({
    id: n.id ?? "unknown",
    type: n.type ?? "infoNode",
    data: n.data ?? {},
    ...n,
  }));
  const fullEdges = edges.map((e) => ({
    source: e.source ?? "",
    target: e.target ?? "",
    sourceHandle: e.sourceHandle ?? null,
    ...e,
  }));
  buildIndexes({ nodes: fullNodes, edges: fullEdges } as QuizData);
}

describe("navigation", () => {
  beforeEach(() => {
    resetState();
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════
  // getNextNodeId
  // ═══════════════════════════════════════════════════════════════════

  describe("getNextNodeId", () => {
    it("finds next node by default handle", () => {
      buildQuiz([{ id: "a" }, { id: "b" }], [{ source: "a", target: "b" }]);
      expect(getNextNodeId("a")).toBe("b");
    });

    it("finds next node by specific handle", () => {
      buildQuiz(
        [{ id: "a" }, { id: "b" }, { id: "c" }],
        [
          { source: "a", target: "b", sourceHandle: "option-0" },
          { source: "a", target: "c", sourceHandle: "option-1" },
        ],
      );
      expect(getNextNodeId("a", "option-1")).toBe("c");
    });

    it("falls back to default handle when specific not found", () => {
      buildQuiz(
        [{ id: "a" }, { id: "b" }],
        [{ source: "a", target: "b", sourceHandle: null }],
      );
      expect(getNextNodeId("a", "nonexistent")).toBe("b");
    });

    it("returns null when no edges exist", () => {
      buildQuiz([{ id: "a" }], []);
      expect(getNextNodeId("a")).toBeNull();
    });

    it("applies edge effects when traversing", () => {
      buildQuiz(
        [{ id: "a" }, { id: "b" }],
        [
          {
            source: "a",
            target: "b",
            data: {
              effects: [{ variableName: "bonus", op: "set", value: 10 }],
            },
          },
        ],
      );

      getNextNodeId("a");
      expect(getState().variables.bonus).toBe(10);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // resolveNextNode
  // ═══════════════════════════════════════════════════════════════════

  describe("resolveNextNode", () => {
    it("finds direct next node", () => {
      buildQuiz([{ id: "a" }, { id: "b" }], [{ source: "a", target: "b" }]);
      expect(resolveNextNode("a", null)).toBe("b");
    });

    it("traverses up through group parent when no direct exit", () => {
      buildQuiz(
        [
          { id: "group", type: "groupNode" },
          { id: "child", type: "infoNode", parentId: "group" },
          { id: "after-group", type: "infoNode" },
        ],
        [{ source: "group", target: "after-group" }],
      );

      expect(resolveNextNode("child", null)).toBe("after-group");
    });

    it("returns null when max depth exceeded", () => {
      // Create deeply nested groups
      const nodes: any[] = [];
      for (let i = 0; i < 25; i++) {
        nodes.push({
          id: `g${i}`,
          type: "groupNode",
          parentId: i > 0 ? `g${i - 1}` : undefined,
        });
      }
      buildQuiz(nodes, []);

      expect(resolveNextNode("g24", null)).toBeNull();
    });

    it("returns null when no exit found at any level", () => {
      buildQuiz([{ id: "orphan" }], []);
      expect(resolveNextNode("orphan", null)).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // processNode — basic flow
  // ═══════════════════════════════════════════════════════════════════

  describe("processNode — basic flow", () => {
    it("renders UI nodes", () => {
      buildQuiz([{ id: "info-1", type: "infoNode", data: { title: "Hello" } }]);
      processNode("info-1");

      expect(renderNode).toHaveBeenCalledOnce();
      expect(renderNode).toHaveBeenCalledWith(
        expect.objectContaining({ id: "info-1" }),
      );
    });

    it("records node in path", () => {
      buildQuiz([{ id: "n1", type: "infoNode" }]);
      processNode("n1");
      expect(getState().path[0].nodeId).toBe("n1");
    });

    it("sets current node id", () => {
      buildQuiz([{ id: "n1", type: "infoNode" }]);
      processNode("n1");
      expect(getState().currentNodeId).toBe("n1");
    });

    it("marks interactive nodes as visited", () => {
      buildQuiz([{ id: "q1", type: "questionNode" }]);
      processNode("q1");
      expect(getState().visitedInteractiveNodes.has("q1")).toBe(true);
    });

    it("does not mark non-interactive nodes as visited", () => {
      buildQuiz([{ id: "i1", type: "infoNode" }]);
      processNode("i1");
      expect(getState().visitedInteractiveNodes.has("i1")).toBe(false);
    });

    it("silently ignores non-existent node", () => {
      buildQuiz([]);
      processNode("nonexistent");
      expect(renderNode).not.toHaveBeenCalled();
      expect(renderError).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // processNode — logic nodes
  // ═══════════════════════════════════════════════════════════════════

  describe("processNode — logic nodes", () => {
    it("executes scoreNode (add)", async () => {
      buildQuiz(
        [
          {
            id: "s1",
            type: "scoreNode",
            data: { operation: "add", value: 10 },
          },
          { id: "next", type: "infoNode" },
        ],
        [{ source: "s1", target: "next" }],
      );

      processNode("s1");
      expect(getState().score).toBe(10);

      // Wait for setTimeout in executeLogic
      await vi.waitFor(() => {
        expect(renderNode).toHaveBeenCalledWith(
          expect.objectContaining({ id: "next" }),
        );
      });
    });

    it("executes conditionNode — true branch", async () => {
      updateScore("set", 80);

      buildQuiz(
        [
          {
            id: "c1",
            type: "conditionNode",
            data: { variable: "score", operator: ">=", conditionValue: 50 },
          },
          { id: "pass", type: "infoNode" },
          { id: "fail", type: "infoNode" },
        ],
        [
          { source: "c1", target: "pass", sourceHandle: "true" },
          { source: "c1", target: "fail", sourceHandle: "false" },
        ],
      );

      processNode("c1");

      await vi.waitFor(() => {
        expect(renderNode).toHaveBeenCalledWith(
          expect.objectContaining({ id: "pass" }),
        );
      });
    });

    it("executes conditionNode — false branch", async () => {
      updateScore("set", 20);

      buildQuiz(
        [
          {
            id: "c1",
            type: "conditionNode",
            data: { variable: "score", operator: ">=", conditionValue: 50 },
          },
          { id: "pass", type: "infoNode" },
          { id: "fail", type: "infoNode" },
        ],
        [
          { source: "c1", target: "pass", sourceHandle: "true" },
          { source: "c1", target: "fail", sourceHandle: "false" },
        ],
      );

      processNode("c1");

      await vi.waitFor(() => {
        expect(renderNode).toHaveBeenCalledWith(
          expect.objectContaining({ id: "fail" }),
        );
      });
    });

    it("executes variableNode", async () => {
      buildQuiz(
        [
          {
            id: "v1",
            type: "variableNode",
            data: { variableName: "theme", operation: "set", value: "dark" },
          },
          { id: "next", type: "infoNode" },
        ],
        [{ source: "v1", target: "next" }],
      );

      processNode("v1");
      expect(getState().variables.theme).toBe("dark");
    });

    it("executes goToNode", async () => {
      buildQuiz(
        [
          { id: "goto-1", type: "goToNode", data: { targetNodeId: "target" } },
          { id: "target", type: "infoNode", data: { title: "Target" } },
        ],
        [],
      );

      processNode("goto-1");

      await vi.waitFor(() => {
        expect(renderNode).toHaveBeenCalledWith(
          expect.objectContaining({ id: "target" }),
        );
      });
    });

    it("executes startNode and moves to next", async () => {
      buildQuiz(
        [
          { id: "start", type: "startNode" },
          { id: "first", type: "infoNode" },
        ],
        [{ source: "start", target: "first" }],
      );

      processNode("start");

      await vi.waitFor(() => {
        expect(renderNode).toHaveBeenCalledWith(
          expect.objectContaining({ id: "first" }),
        );
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // processNode — circuit breaker
  // ═══════════════════════════════════════════════════════════════════

  describe("processNode — circuit breaker", () => {
    it("detects infinite GoTo loop and renders error", async () => {
      buildQuiz(
        [
          { id: "a", type: "goToNode", data: { targetNodeId: "b" } },
          { id: "b", type: "goToNode", data: { targetNodeId: "a" } },
        ],
        [],
      );

      processNode("a");

      // After MAX_LOGIC_CHAIN iterations, renderError should be called
      await vi.waitFor(
        () => {
          expect(renderError).toHaveBeenCalled();
        },
        { timeout: 5000 },
      );
    });

    it("detects infinite score chain and renders error", async () => {
      buildQuiz(
        [
          { id: "s1", type: "scoreNode", data: { operation: "add", value: 1 } },
          { id: "s2", type: "scoreNode", data: { operation: "add", value: 1 } },
        ],
        [
          { source: "s1", target: "s2" },
          { source: "s2", target: "s1" },
        ],
      );

      processNode("s1");

      await vi.waitFor(
        () => {
          expect(renderError).toHaveBeenCalled();
        },
        { timeout: 5000 },
      );

      // Score should not be astronomical
      expect(getState().score).toBeLessThanOrEqual(200);
    });

    it("resets logic chain depth after rendering UI node", async () => {
      buildQuiz(
        [
          { id: "s1", type: "scoreNode", data: { operation: "add", value: 1 } },
          { id: "info", type: "infoNode", data: { title: "Break" } },
        ],
        [{ source: "s1", target: "info" }],
      );

      processNode("s1");

      await vi.waitFor(() => {
        expect(renderNode).toHaveBeenCalled();
        expect(renderError).not.toHaveBeenCalled();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // processNode — groups
  // ═══════════════════════════════════════════════════════════════════

  describe("processNode — groups", () => {
    it("enters first child of group", async () => {
      buildQuiz(
        [
          { id: "group", type: "groupNode" },
          { id: "child-1", type: "infoNode", parentId: "group" },
          { id: "child-2", type: "infoNode", parentId: "group" },
        ],
        [],
      );

      processNode("group");

      expect(renderNode).toHaveBeenCalledWith(
        expect.objectContaining({ id: "child-1" }),
      );
    });

    it("follows group output edge when group has no children", async () => {
      buildQuiz(
        [
          { id: "group", type: "groupNode" },
          { id: "after", type: "infoNode" },
        ],
        [{ source: "group", target: "after" }],
      );

      processNode("group");

      expect(renderNode).toHaveBeenCalledWith(
        expect.objectContaining({ id: "after" }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // processNode — error handling
  // ═══════════════════════════════════════════════════════════════════

  describe("processNode — error handling", () => {
    it("catches errors and renders error screen", () => {
      // Force an error by providing a node with broken data
      buildQuiz([{ id: "bad", type: "infoNode" }]);

      // Mock renderNode to throw
      (renderNode as any).mockImplementationOnce(() => {
        throw new Error("Render failed");
      });

      processNode("bad");
      expect(renderError).toHaveBeenCalledWith(
        expect.stringContaining("ошибка"),
      );
    });
  });
});
