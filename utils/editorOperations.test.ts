import { describe, it, expect } from "vitest";
import type { Node } from "reactflow";
import type { NodeData } from "../types";
import { copyFragment, pasteFragment } from "./editorFragment";
import { validateEditorGraph } from "./editorValidation";
import { useCanvasStore } from "../store/useCanvasStore";
const node = (
  id: string,
  type: string,
  data: Record<string, unknown> = {},
): Node<NodeData> => ({ id, type, position: { x: 0, y: 0 }, data });
describe("editor graph operations", () => {
  it("copies connections, effects and group references and undoes insertion in one step", () => {
    const nodes = [
      node("group", "groupNode"),
      node("q", "questionNode", {
        parentId: "group",
        question: "Q",
        answers: [{ id: "answer", text: "Yes" }],
      }),
      node("r", "resultNode", { parentId: "group" }),
    ];
    const edges = [
      {
        id: "e",
        source: "q",
        target: "r",
        sourceHandle: "answer",
        data: { effects: [{ variableName: "points", op: "add", value: 2 }] },
      },
    ];
    const fragment = pasteFragment(copyFragment(nodes, edges, ["group"]));
    expect(fragment.nodes).toHaveLength(3);
    expect(fragment.edges).toHaveLength(1);
    expect(fragment.nodes[1].data.parentId).toBe(fragment.nodes[0].id);
    expect(fragment.edges[0].source).toBe(fragment.nodes[1].id);
    expect(fragment.edges[0].data).toEqual(edges[0].data);
    useCanvasStore.getState().reset();
    useCanvasStore.setState({
      nodes,
      edges,
      history: { past: [], future: [] },
    });
    useCanvasStore
      .getState()
      .applyGraph([...nodes, ...fragment.nodes], [...edges, ...fragment.edges]);
    useCanvasStore.getState().undo();
    expect(useCanvasStore.getState().nodes).toEqual(nodes);
    expect(useCanvasStore.getState().edges).toEqual(edges);
  });
  it("finds disconnected results, empty answers and ambiguous branches", () => {
    const nodes = [
      node("s", "startNode"),
      node("q", "questionNode", {
        question: "",
        answers: [{ id: "a", text: "" }],
      }),
      node("r", "resultNode"),
    ];
    const issues = validateEditorGraph(nodes, [
      { id: "1", source: "s", target: "q" },
      { id: "2", source: "s", target: "q" },
    ]);
    expect(issues.some((x) => x.message.includes("нельзя добраться"))).toBe(
      true,
    );
    expect(issues.some((x) => x.message.includes("несколько блоков"))).toBe(
      true,
    );
    expect(
      issues.some((x) => x.nodeId === "q" && x.message.includes("текст")),
    ).toBe(true);
  });
  it("accepts a complete branched scenario", () => {
    const nodes = [
      node("s", "startNode"),
      node("q", "questionNode", {
        question: "Q",
        answers: [
          { id: "a", text: "Yes" },
          { id: "b", text: "No" },
        ],
      }),
      node("r", "resultNode"),
    ];
    expect(
      validateEditorGraph(nodes, [
        { id: "1", source: "s", target: "q" },
        { id: "2", source: "q", sourceHandle: "a", target: "r" },
        { id: "3", source: "q", sourceHandle: "b", target: "r" },
      ]),
    ).toEqual([]);
  });
});
