import { describe, it, expect } from "vitest";
import { inlineTailwind } from "../inlineTailwind";

describe("inlineTailwind", () => {
  it("removes Tailwind CDN script tag", () => {
    const html =
      '<head><script src="https://cdn.tailwindcss.com"></script></head>';
    const result = inlineTailwind(html);
    expect(result).not.toContain("cdn.tailwindcss.com");
  });

  it("removes Tailwind CDN with version", () => {
    const html =
      '<head><script src="https://cdn.tailwindcss.com/3.4.0"></script></head>';
    const result = inlineTailwind(html);
    expect(result).not.toContain("cdn.tailwindcss.com");
  });

  it("removes Tailwind CDN with single quotes", () => {
    const html =
      "<head><script src='https://cdn.tailwindcss.com'></script></head>";
    const result = inlineTailwind(html);
    expect(result).not.toContain("cdn.tailwindcss.com");
  });

  it("injects inline style with marker attribute", () => {
    const html = "<html><head></head><body></body></html>";
    const result = inlineTailwind(html);
    expect(result).toContain("data-quiz-tailwind");
    expect(result).toContain("<style");
  });

  it("injects style before </head>", () => {
    const html = "<html><head><title>T</title></head><body></body></html>";
    const result = inlineTailwind(html);
    const styleIdx = result.indexOf("data-quiz-tailwind");
    const headCloseIdx = result.indexOf("</head>");
    expect(styleIdx).toBeLessThan(headCloseIdx);
  });

  it("is idempotent — does not duplicate on second call", () => {
    const html = "<html><head></head><body></body></html>";
    const first = inlineTailwind(html);
    const second = inlineTailwind(first);
    const matches = second.match(/data-quiz-tailwind/g);
    expect(matches).toHaveLength(1);
  });

  it("handles HTML without <head>", () => {
    const html = "<html><body>Content</body></html>";
    const result = inlineTailwind(html);
    expect(result).toContain("data-quiz-tailwind");
  });

  it("preserves other scripts", () => {
    const html =
      '<head><script src="https://example.com/app.js"></script><script src="https://cdn.tailwindcss.com"></script></head>';
    const result = inlineTailwind(html);
    expect(result).toContain("example.com/app.js");
    expect(result).not.toContain("cdn.tailwindcss.com");
  });
});