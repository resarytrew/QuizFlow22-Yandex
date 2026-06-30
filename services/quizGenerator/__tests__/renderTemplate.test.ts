import { describe, it, expect } from "vitest";
import { renderTemplate } from "../renderTemplate";

const TEMPLATE_BOTH = `<!DOCTYPE html>
<html>
<head><title>Quiz</title></head>
<body>
  <script>var quizData = %%QUIZ_DATA_INJECTION%%;</script>
  <script>%%QUIZ_SCRIPT%%</script>
</body>
</html>`;

const TEMPLATE_NO_PLACEHOLDERS = `<!DOCTYPE html>
<html>
<head><title>Quiz</title></head>
<body>
  <div id="quiz-view"></div>
</body>
</html>`;

const TEMPLATE_ONLY_SCRIPT = `<!DOCTYPE html>
<html>
<head></head>
<body>
  <script>%%QUIZ_SCRIPT%%</script>
</body>
</html>`;

const SAMPLE_JSON = '{"nodes":[],"edges":[]}';
const SAMPLE_SCRIPT = 'console.log("engine")';

describe("renderTemplate", () => {
  // ── Both placeholders present ──

  it("replaces both placeholders", () => {
    const result = renderTemplate(TEMPLATE_BOTH, SAMPLE_JSON, SAMPLE_SCRIPT);
    expect(result).not.toContain("%%QUIZ_DATA_INJECTION%%");
    expect(result).not.toContain("%%QUIZ_SCRIPT%%");
    expect(result).toContain(SAMPLE_JSON);
    expect(result).toContain(SAMPLE_SCRIPT);
  });

  it("does NOT double-inject when placeholders are present", () => {
    const result = renderTemplate(TEMPLATE_BOTH, SAMPLE_JSON, SAMPLE_SCRIPT);
    const scriptMatches = result.match(/console\.log\("engine"\)/g);
    expect(scriptMatches).toHaveLength(1);
  });

  // ── No placeholders ──

  it("injects data block before </body> when no data placeholder", () => {
    const result = renderTemplate(
      TEMPLATE_NO_PLACEHOLDERS,
      SAMPLE_JSON,
      SAMPLE_SCRIPT,
    );
    expect(result).toContain('type="application/json"');
    expect(result).toContain('id="quiz-data"');
    expect(result).toContain(SAMPLE_JSON);
  });

  it("injects script block before </body> when no script placeholder", () => {
    const result = renderTemplate(
      TEMPLATE_NO_PLACEHOLDERS,
      SAMPLE_JSON,
      SAMPLE_SCRIPT,
    );
    expect(result).toContain(`<script>\n      ${SAMPLE_SCRIPT}\n    </script>`);
  });

  it("can skip generic engine injection for templates with their own runner", () => {
    const result = renderTemplate(
      TEMPLATE_NO_PLACEHOLDERS,
      SAMPLE_JSON,
      SAMPLE_SCRIPT,
      { injectEngine: false },
    );

    expect(result).toContain('id="quiz-data"');
    expect(result).not.toContain(SAMPLE_SCRIPT);
  });

  it("injects exactly once when no placeholders", () => {
    const result = renderTemplate(
      TEMPLATE_NO_PLACEHOLDERS,
      SAMPLE_JSON,
      SAMPLE_SCRIPT,
    );
    const engineMatches = result.match(/console\.log\("engine"\)/g);
    expect(engineMatches).toHaveLength(1);
  });

  // ── Partial placeholders ──

  it("handles template with only script placeholder", () => {
    const result = renderTemplate(
      TEMPLATE_ONLY_SCRIPT,
      SAMPLE_JSON,
      SAMPLE_SCRIPT,
    );

    // Script replaced in placeholder
    expect(result).not.toContain("%%QUIZ_SCRIPT%%");
    expect(result).toContain(SAMPLE_SCRIPT);

    // Data injected before </body>
    expect(result).toContain("quiz-data");
    expect(result).toContain(SAMPLE_JSON);

    // No double injection of script
    const matches = result.match(/console\.log\("engine"\)/g);
    expect(matches).toHaveLength(1);
  });

  // ── Multiple placeholder occurrences ──

  it("replaces all occurrences of data placeholder", () => {
    const template =
      "<body>%%QUIZ_DATA_INJECTION%% and %%QUIZ_DATA_INJECTION%%</body>";
    const result = renderTemplate(template, '"data"', "script");
    expect(result).not.toContain("%%QUIZ_DATA_INJECTION%%");
  });

  // ── Edge cases ──

  it("handles empty template", () => {
    const result = renderTemplate("", SAMPLE_JSON, SAMPLE_SCRIPT);
    expect(result).toContain(SAMPLE_JSON);
    expect(result).toContain(SAMPLE_SCRIPT);
  });

  it("handles empty quiz data JSON", () => {
    const result = renderTemplate(TEMPLATE_BOTH, "{}", SAMPLE_SCRIPT);
    expect(result).toContain("{}");
  });

  it("handles script with special regex characters", () => {
    const script = 'var x = "$1 $$$ $& $`";';
    const result = renderTemplate(TEMPLATE_BOTH, SAMPLE_JSON, script);
    // $1, $$$, etc. are special in .replace() — should be literal
    expect(result).toContain(script);
  });
});
