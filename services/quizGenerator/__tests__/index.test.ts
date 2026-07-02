import { describe, it, expect, vi } from "vitest";
import {
  generateQuizHtml,
  generateQuizHtmlProgrammatically,
} from "../index";

// Мокаем внешние зависимости
vi.mock("../../quizEngine", () => ({
  quizEngineScript: 'console.log("engine-mock");',
}));

vi.mock("../../templates/index", () => ({
  getTemplateById: (id: string) =>
    `<!DOCTYPE html><html><head><title>${id}</title></head><body>%%QUIZ_DATA_INJECTION%% %%QUIZ_SCRIPT%%</body></html>`,
}));

vi.mock("../env", () => ({
  getApiBaseUrl: () => "https://test.apigw.yandexcloud.net/api",
  getApiOrigin: () => "https://test.apigw.yandexcloud.net",
}));

describe("generateQuizHtml (integration)", () => {
  const minimalInput = {
    nodes: [{ id: "start", type: "startNode", data: {} }],
    edges: [],
  };

  // ═══════════════════════════════════════════════════════════════════
  // Happy path
  // ═══════════════════════════════════════════════════════════════════

  it("returns valid HTML", () => {
    const html = generateQuizHtml(minimalInput);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });

  it("embeds quiz data as JSON", () => {
    const html = generateQuizHtml(minimalInput);
    expect(html).toContain('"startNode"');
  });

  it("embeds engine script", () => {
    const html = generateQuizHtml(minimalInput);
    expect(html).toContain("engine-mock");
  });

  it("injects CSP meta", () => {
    const html = generateQuizHtml(minimalInput);
    expect(html).toContain("Content-Security-Policy");
  });

  it("inlines Tailwind CSS", () => {
    const html = generateQuizHtml(minimalInput);
    expect(html).toContain("data-quiz-tailwind");
  });

  it("includes API origin in CSP connect-src", () => {
    const html = generateQuizHtml(minimalInput);
    expect(html).toContain("https://test.apigw.yandexcloud.net");
  });

  it("uses specified template", () => {
    const html = generateQuizHtml({
      ...minimalInput,
      templateId: "science" as any,
    });
    expect(html).toContain("<title>science</title>");
  });

  it("injects design settings CSS in preview mode", () => {
    const html = generateQuizHtml(
      {
        ...minimalInput,
        designSettings: {
          background: { color: "#123456", mode: "solid" },
          typography: { headingColor: "#abcdef", bodyTextColor: "#654321" },
          buttons: { backgroundColor: "#112233", textColor: "#ffffff" },
          answerCards: {
            backgroundColor: "#fafafa",
            selectedBorderColor: "#334455",
          },
        },
      },
      { preview: true },
    );

    expect(html).toContain('id="quiz-design-settings"');
    expect(html).toContain("--bg-color: #123456");
    expect(html).toContain("--heading-color: #abcdef");
    expect(html).toContain("--btn-bg: #112233");
    expect(html).toContain('src="/assets/__quiz_engine.js"');
  });

  it("does not inject design settings CSS for non-default templates", () => {
    const html = generateQuizHtml(
      {
        ...minimalInput,
        templateId: "science" as any,
        designSettings: {
          background: { color: "#123456", mode: "solid" },
        },
      },
      { preview: true },
    );

    expect(html).not.toContain('id="quiz-design-settings"');
    expect(html).not.toContain("--bg-color: #123456");
  });

  it("does not contain raw placeholders", () => {
    const html = generateQuizHtml(minimalInput);
    expect(html).not.toContain("%%QUIZ_DATA_INJECTION%%");
    expect(html).not.toContain("%%QUIZ_SCRIPT%%");
  });

  it("escapes </script> in quiz data", () => {
    const html = generateQuizHtml({
      nodes: [
        { id: "1", type: "infoNode", data: { title: "</script>XSS" } },
      ],
      edges: [],
    });
    expect(html).not.toContain("</script>XSS");
  });

  // ═══════════════════════════════════════════════════════════════════
  // Error handling
  // ═══════════════════════════════════════════════════════════════════

  it("returns fallback HTML for invalid nodes", () => {
    const html = generateQuizHtml({
      nodes: "not an array" as any,
      edges: [],
    });
    expect(html).toContain("Ошибка");
    expect(html).toContain("nodes");
  });

  it("returns fallback HTML for invalid edges", () => {
    const html = generateQuizHtml({
      nodes: [],
      edges: "not an array" as any,
    });
    expect(html).toContain("Ошибка");
  });

  it("fallback HTML is a valid document", () => {
    const html = generateQuizHtml({
      nodes: null as any,
      edges: [],
    });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });

  // ═══════════════════════════════════════════════════════════════════
  // No double injection
  // ═══════════════════════════════════════════════════════════════════

  it("does not inject engine script twice", () => {
    const html = generateQuizHtml(minimalInput);
    const matches = html.match(/engine-mock/g);
    expect(matches).toHaveLength(1);
  });

  // ═══════════════════════════════════════════════════════════════════
  // Default values
  // ═══════════════════════════════════════════════════════════════════

  it("uses default template when not specified", () => {
    const html = generateQuizHtml({ nodes: [], edges: [] });
    expect(html).toContain("<title>default</title>");
  });

  it("includes globalTimer defaults in payload", () => {
    const html = generateQuizHtml({ nodes: [], edges: [] });
    expect(html).toContain('"enabled":false');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Legacy API
// ═══════════════════════════════════════════════════════════════════════

describe("generateQuizHtmlProgrammatically (legacy)", () => {
  it("works with positional arguments", () => {
    const html = generateQuizHtmlProgrammatically(
      [{ id: "1", type: "startNode", data: {} }],
      [],
    );
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("engine-mock");
  });

  it("works with object argument", () => {
    const html = generateQuizHtmlProgrammatically({
      nodes: [{ id: "1", type: "startNode", data: {} }],
      edges: [],
      templateId: "science",
    });
    expect(html).toContain("<title>science</title>");
  });

  it("works with no arguments", () => {
    const html = generateQuizHtmlProgrammatically();
    // Should return valid HTML (empty quiz)
    expect(html).toContain("<!DOCTYPE html>");
  });
});
