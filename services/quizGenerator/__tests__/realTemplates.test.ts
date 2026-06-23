import { describe, expect, it } from "vitest";
import { templates } from "../../templates";
import { renderTemplate } from "../renderTemplate";

const QUIZ_DATA = JSON.stringify({
  nodes: [{ id: "start", type: "startNode", data: { title: "Loaded quiz" } }],
  edges: [],
  currentQuizName: "Imported quiz",
});

const executableInlineScript =
  /<script(?![^>]*\bsrc\s*=)(?![^>]*\btype\s*=\s*["']application\/json["'])[^>]*>[\s\S]*?<\/script>/i;

describe("real quiz templates in preview mode", () => {
  it.each(Object.entries(templates))(
    "renders quiz data and CSP-safe scripts for %s",
    (_templateId, templateInfo) => {
      const html = renderTemplate(
        templateInfo.template,
        QUIZ_DATA,
        "window.__sharedQuizEngineStarted = true;",
        { preview: true },
      );

      expect(html).toContain("Imported quiz");
      expect(html).not.toContain("%%QUIZ_DATA_INJECTION%%");
      expect(html).not.toContain("%%QUIZ_SCRIPT%%");
      expect(html).not.toMatch(executableInlineScript);
      expect(html).not.toContain('src="https://cdn.jsdelivr.net');
      expect(html).not.toContain('src="https://cdnjs.cloudflare.com');

      if (templateInfo.template.includes("%%QUIZ_SCRIPT%%")) {
        expect(html).toContain('src="/assets/__quiz_engine.js"');
        expect(html).not.toContain('src="/assets/__quiz_template_runner.js"');
      } else {
        expect(html).toContain('data-quiz-inline-script');
        expect(html).toContain('src="/assets/__quiz_template_runner.js"');
        expect(html).not.toContain('src="/assets/__quiz_engine.js"');
      }
    },
  );
});
