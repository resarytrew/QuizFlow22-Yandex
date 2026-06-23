import { describe, expect, it } from "vitest";
import { CustomNodeType } from "../../types";
import { createNewNode } from "./createNewNode";
import { nodeTypes } from "./nodeTypes";

const allNodeTypes = Object.values(CustomNodeType);

describe("quiz editor node registry", () => {
  it.each(allNodeTypes)("%s has an editor component", (type) => {
    expect(nodeTypes[type]).toBeDefined();
  });

  it.each(allNodeTypes)("%s can be created with initial data", (type) => {
    const node = createNewNode(type, { x: 120, y: 80 });

    expect(node).toMatchObject({
      type,
      position: { x: 120, y: 80 },
    });
    expect(node.id).toContain(`${type}-`);
    expect(node.data).toBeTruthy();
  });
});
