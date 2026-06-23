import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { generateQuizHtmlProgrammatically } from "../quizGenerator";

function createHtml(nodes: any[], edges: any[]): string {
  return generateQuizHtmlProgrammatically(
    nodes,
    edges,
    { enabled: false, duration: 0, onTimeoutNodeId: null },
    {},
    null,
    "default",
    "Node test",
  )
    .replace(/<meta[^>]*Content-Security-Policy[^>]*>/gi, "")
    .replace(/<script[^>]*\bsrc=[^>]*><\/script>/gi, "");
}

async function boot(nodes: any[], edges: any[], beforeParse?: (window: any) => void) {
  const dom = new JSDOM(createHtml(nodes, edges), {
    runScripts: "dangerously",
    url: "http://localhost/",
    pretendToBeVisual: true,
    beforeParse,
  });

  const deadline = Date.now() + 2000;
  while (!(dom.window as any).quizData) {
    if (Date.now() > deadline) throw new Error("Quiz engine did not initialize");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  while (!dom.window.document.getElementById("quiz-view")?.hasChildNodes()) {
    if (Date.now() > deadline) throw new Error("Quiz node did not render");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return dom;
}

const start = { id: "start", type: "startNode", data: {} };
const edgeToNode = { source: "start", target: "node" };

describe("default quiz engine node support", () => {
  it.each([
    ["questionNode", { question: "Choose", answers: [{ id: "a", text: "Answer A" }] }, "Answer A"],
    ["multipleChoiceNode", { answers: [{ id: "a", text: "A" }], correctOptions: ["a"] }, "Подтвердить"],
    ["matchingNode", {
      leftColumn: [{ id: "l", text: "Left" }],
      rightColumn: [{ id: "r", text: "Right" }],
      correctPairs: [{ leftId: "l", rightId: "r" }],
    }, "Проверить"],
    ["timelineNode", { events: [{ id: "1", text: "First" }] }, "Проверить"],
    ["textInputNode", { keyword: "answer" }, "Ваш ответ"],
    ["collectInfoNode", {
      fields: [{ id: "f", label: "Email", type: "email", variableName: "email" }],
    }, "Email"],
    ["dialogueNode", { characterName: "Teacher", dialogueText: "Hello" }, "Teacher"],
    ["allocatorNode", {
      maxTotal: 10,
      items: [{ id: "x", label: "Points", variableName: "points", defaultValue: 2 }],
    }, "Распределено"],
    ["timerNode", { duration: 5, action: "wait" }, "5"],
    ["infoNode", { title: "Info screen" }, "Info screen"],
    ["feedbackNode", { message: "Feedback screen" }, "Feedback screen"],
    ["resultNode", { title: "Done" }, "Начать заново"],
  ])("renders %s controls", async (type, data, expectedText) => {
    const dom = await boot(
      [start, { id: "node", type, data }],
      [edgeToNode],
    );

    expect(dom.window.document.getElementById("quiz-view")?.innerHTML).toContain(expectedText);
    dom.window.close();
  });

  it("supports editor condition operators after a formula node", async () => {
    const dom = await boot(
      [
        start,
        {
          id: "formula",
          type: "formulaNode",
          data: { expression: "2 + 2", variableName: "result" },
        },
        {
          id: "condition",
          type: "conditionNode",
          data: { variable: "result", operator: "eq", value: 4 },
        },
        { id: "success", type: "infoNode", data: { title: "Success" } },
        { id: "failure", type: "infoNode", data: { title: "Failure" } },
      ],
      [
        { source: "start", target: "formula" },
        { source: "formula", target: "condition" },
        { source: "condition", sourceHandle: "true", target: "success" },
        { source: "condition", sourceHandle: "false", target: "failure" },
      ],
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(dom.window.document.getElementById("quiz-view")?.textContent).toContain("Success");
    dom.window.close();
  });

  it("does not render groupNode as a screen", async () => {
    const dom = await boot(
      [
        start,
        { id: "group", type: "groupNode", data: { title: "Group screen" } },
        { id: "child", type: "infoNode", parentId: "group", data: { title: "Inside group" } },
      ],
      [
        { source: "start", target: "group" },
      ],
    );

    const text = dom.window.document.getElementById("quiz-view")?.textContent ?? "";
    expect(text).toContain("Inside group");
    expect(text).not.toContain("Group screen");
    dom.window.close();
  });

  it("opens and closes the image lightbox without inline handlers", async () => {
    const imageUrl = "https://example.com/question.png";
    const dom = await boot(
      [
        start,
        {
          id: "node",
          type: "infoNode",
          data: { title: "Illustration", imageUrl },
        },
      ],
      [edgeToNode],
    );

    const image = dom.window.document.querySelector(
      "#quiz-view .quiz-zoomable-image",
    ) as HTMLImageElement | null;
    const modal = dom.window.document.getElementById("image-modal");
    const modalImage = dom.window.document.getElementById(
      "modal-img-src",
    ) as HTMLImageElement;

    expect(image).not.toBeNull();
    image?.click();
    expect(modal?.classList.contains("open")).toBe(true);
    expect(modalImage.src).toBe(imageUrl);

    modal?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    expect(modal?.classList.contains("open")).toBe(false);
    dom.window.close();
  });

  it("renders matching images and follows the correct pair branch", async () => {
    const dom = await boot(
      [
        start,
        {
          id: "node",
          type: "matchingNode",
          data: {
            leftColumn: [{
              id: "l",
              text: "Left",
              imageUrl: "https://example.com/left.png",
            }],
            rightColumn: [{
              id: "r",
              text: "Right",
              imageUrl: "https://example.com/right.png",
            }],
            correctPairs: [{ leftId: "l", rightId: "r" }],
          },
        },
        { id: "success", type: "infoNode", data: { title: "Matched" } },
        { id: "failure", type: "infoNode", data: { title: "Try again" } },
      ],
      [
        edgeToNode,
        { source: "node", sourceHandle: "correct", target: "success" },
        { source: "node", sourceHandle: "incorrect", target: "failure" },
      ],
    );

    const document = dom.window.document;
    expect(document.querySelectorAll(".match-item-image")).toHaveLength(2);
    (document.querySelector('[data-match-side="left"]') as HTMLElement | null)?.click();
    (document.querySelector('[data-match-side="right"]') as HTMLElement | null)?.click();
    expect(document.querySelectorAll(".match-item.matched")).toHaveLength(2);

    (Array.from(document.querySelectorAll("button")) as HTMLButtonElement[])
      .find((button) => button.textContent?.includes("Проверить"))
      ?.click();
    expect(document.getElementById("quiz-view")?.textContent).toContain("Matched");
    dom.window.close();
  });

  it("unlocks an achievement and continues", async () => {
    const dom = await boot(
      [
        start,
        { id: "achievement", type: "achievementNode", data: { title: "First achievement" } },
        { id: "success", type: "infoNode", data: { title: "After achievement" } },
      ],
      [
        { source: "start", target: "achievement" },
        { source: "achievement", target: "success" },
      ],
    );

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(dom.window.document.getElementById("quiz-view")?.textContent).toContain("After achievement");
    dom.window.close();
  });

  it("uses the levelUp branch of a progression node", async () => {
    const dom = await boot(
      [
        start,
        {
          id: "progression",
          type: "progressionNode",
          data: {
            levelVar: "level",
            nameVar: "rank",
            onLevelUpHandle: "levelUp",
            rules: [{
              level: 1,
              name: "Beginner",
              requirements: [{ type: "minScore", value: 0 }],
            }],
          },
        },
        { id: "success", type: "infoNode", data: { title: "Level raised" } },
        { id: "failure", type: "infoNode", data: { title: "Default branch" } },
      ],
      [
        { source: "start", target: "progression" },
        { source: "progression", sourceHandle: "levelUp", target: "success" },
        { source: "progression", target: "failure" },
      ],
    );

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(dom.window.document.getElementById("quiz-view")?.textContent).toContain("Level raised");
    dom.window.close();
  });
});
