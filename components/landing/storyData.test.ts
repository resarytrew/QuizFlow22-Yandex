import { describe, expect, it } from "vitest";
import { CustomNodeType } from "../../types";
import {
  nextStoryNode,
  storyEdges,
  storyNodes,
  storyQuestion,
} from "./storyData";

describe("landing story and playable demo", () => {
  it.each([
    ["mountain", "first", "weekend"],
    ["mountain", "often", "summit"],
    ["sea", "calm", "bay"],
    ["sea", "active", "waves"],
  ])("follows %s / %s to %s using canvas edges", (choice, detail, result) => {
    const branch = nextStoryNode("holiday", choice);
    expect(branch).toBeDefined();
    expect(nextStoryNode(branch!, detail)).toBe(result);
    expect(storyNodes.find((node) => node.id === result)?.type).toBe(
      CustomNodeType.Result,
    );
  });

  it("connects every answer exactly once, without missing targets or outgoing results", () => {
    for (const node of storyNodes) {
      if (node.type === CustomNodeType.Question) {
        for (const answer of storyQuestion(node.id).answers ?? []) {
          const edges = storyEdges.filter(
            (edge) =>
              edge.source === node.id && edge.sourceHandle === answer.id,
          );
          expect(edges).toHaveLength(1);
          expect(
            storyNodes.some((target) => target.id === edges[0].target),
          ).toBe(true);
        }
      }
      if (node.type === CustomNodeType.Result)
        expect(storyEdges.some((edge) => edge.source === node.id)).toBe(false);
    }
    expect(nextStoryNode("holiday", "unknown")).toBeUndefined();
  });
});
