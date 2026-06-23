import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  escapeHtml,
  sanitizeAssetUrl,
  sanitizeHtml,
  parseText,
} from "../sanitize";
import * as stateModule from "../state";

// ═══════════════════════════════════════════════════════════════════════
// escapeHtml
// ═══════════════════════════════════════════════════════════════════════

describe("escapeHtml", () => {
  it("escapes ampersand", () => {
    expect(escapeHtml("a&b")).toBe("a&amp;b");
  });

  it("escapes less-than", () => {
    expect(escapeHtml("a<b")).toBe("a&lt;b");
  });

  it("escapes greater-than", () => {
    expect(escapeHtml("a>b")).toBe("a&gt;b");
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('a"b')).toBe("a&quot;b");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("a'b")).toBe("a&#39;b");
  });

  it("escapes all dangerous characters simultaneously", () => {
    expect(escapeHtml(`<script>alert("xss")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
    );
  });

  it("coerces non-string values to string", () => {
    expect(escapeHtml(42)).toBe("42");
    expect(escapeHtml(null)).toBe("null");
    expect(escapeHtml(undefined)).toBe("undefined");
    expect(escapeHtml(true)).toBe("true");
  });

  it("returns empty string for empty input", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("preserves safe characters", () => {
    const safe = "Hello, World! 123 абвгд @#%";
    expect(escapeHtml(safe)).toBe(safe);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// sanitizeAssetUrl
// ═══════════════════════════════════════════════════════════════════════

describe("sanitizeAssetUrl", () => {
  // ── Valid URLs ──

  it("allows https URLs", () => {
    expect(sanitizeAssetUrl("https://example.com/img.png")).toBe(
      "https://example.com/img.png",
    );
  });

  it("allows http URLs", () => {
    expect(sanitizeAssetUrl("http://example.com/img.png")).toBe(
      "http://example.com/img.png",
    );
  });

  it("allows https with path, query and fragment", () => {
    const url = "https://cdn.example.com/images/photo.jpg?w=800&h=600#top";
    expect(sanitizeAssetUrl(url)).toBe(url);
  });

  it("allows safe data URI (png base64)", () => {
    const dataUri = "data:image/png;base64,iVBORw0KGgo=";
    expect(sanitizeAssetUrl(dataUri)).toBe(dataUri);
  });

  it("allows safe data URI (jpeg base64)", () => {
    const dataUri = "data:image/jpeg;base64,/9j/4AAQ=";
    expect(sanitizeAssetUrl(dataUri)).toBe(dataUri);
  });

  it("allows safe data URI (webp base64)", () => {
    const dataUri = "data:image/webp;base64,UklGRl4=";
    expect(sanitizeAssetUrl(dataUri)).toBe(dataUri);
  });

  // ── Blocked URLs ──

  it("blocks javascript: protocol", () => {
    expect(sanitizeAssetUrl("javascript:alert(1)")).toBe("");
  });

  it("blocks javascript: with mixed case", () => {
    expect(sanitizeAssetUrl("JaVaScRiPt:alert(1)")).toBe("");
  });

  it("blocks data:text/html", () => {
    expect(sanitizeAssetUrl("data:text/html,<script>alert(1)</script>")).toBe(
      "",
    );
  });

  it("blocks data:image/svg+xml (XSS vector)", () => {
    expect(
      sanitizeAssetUrl("data:image/svg+xml,<svg onload=alert(1)>"),
    ).toBe("");
  });

  it("blocks data URI exceeding max length", () => {
    const huge = "data:image/png;base64," + "A".repeat(800_000);
    expect(sanitizeAssetUrl(huge)).toBe("");
  });

  it("blocks protocol-relative URLs", () => {
    // new URL("//evil.com") без base → throws → ""
    expect(sanitizeAssetUrl("//evil.com/img.png")).toBe("");
  });

  it("blocks ftp: protocol", () => {
    expect(sanitizeAssetUrl("ftp://files.example.com/img.png")).toBe("");
  });

  it("blocks blob: protocol", () => {
    expect(sanitizeAssetUrl("blob:http://localhost/abc")).toBe("");
  });

  // ── Edge cases ──

  it("returns empty string for null", () => {
    expect(sanitizeAssetUrl(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(sanitizeAssetUrl(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(sanitizeAssetUrl("")).toBe("");
  });

  it("returns empty string for non-string", () => {
    expect(sanitizeAssetUrl(42)).toBe("");
    expect(sanitizeAssetUrl({})).toBe("");
  });

  it("returns empty string for malformed URL", () => {
    expect(sanitizeAssetUrl("not a url at all")).toBe("");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// sanitizeHtml
// ═══════════════════════════════════════════════════════════════════════

describe("sanitizeHtml", () => {
  it("strips script tags (fallback when no DOMPurify)", () => {
    // В тестовом окружении DOMPurify может отсутствовать
    const result = sanitizeHtml("<script>alert(1)</script>Hello");
    expect(result).not.toContain("<script>");
  });

  it("preserves safe HTML when DOMPurify is available", () => {
    // Мокаем DOMPurify
    const original = (globalThis as any).window?.DOMPurify;
    (globalThis as any).window = {
      DOMPurify: {
        sanitize: (html: string, opts: any) => {
          // Простая имитация: убрать script
          return html.replace(/<script[^>]*>.*?<\/script>/gi, "");
        },
      },
    };

    const result = sanitizeHtml("<strong>Bold</strong><script>xss</script>");
    expect(result).toContain("<strong>Bold</strong>");
    expect(result).not.toContain("script");

    // Restore
    if (original !== undefined) {
      (globalThis as any).window.DOMPurify = original;
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// parseText
// ═══════════════════════════════════════════════════════════════════════

describe("parseText", () => {
  beforeEach(() => {
    stateModule.resetState();
  });

  // ── Variable substitution ──

  it("substitutes {{score}}", () => {
    stateModule.updateScore("set", 42);
    const result = parseText("Score: {{score}}");
    expect(result).toContain("42");
  });

  it("substitutes custom variables", () => {
    stateModule.setVariable("playerName", "Alice");
    const result = parseText("Hello, {{playerName}}!");
    expect(result).toContain("Alice");
  });

  it("preserves unknown variables as-is", () => {
    const result = parseText("Value: {{unknown}}");
    expect(result).toContain("{{unknown}}");
  });

  it("escapes variable values to prevent XSS", () => {
    stateModule.setVariable("name", '<script>alert("xss")</script>');
    const result = parseText("Hello, {{name}}!");
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });

  // ── Markdown ──

  it("renders bold text", () => {
    const result = parseText("**bold**");
    expect(result).toContain("<strong>bold</strong>");
  });

  it("renders italic text", () => {
    const result = parseText("*italic*");
    expect(result).toContain("<em>italic</em>");
  });

  it("renders bold+italic (***)", () => {
    const result = parseText("***bold italic***");
    expect(result).toContain("<strong><em>bold italic</em></strong>");
  });

it("renders safe links", () => {
  const result = parseText("[Google](https://google.com)");
  // new URL() нормализует URL и может добавить trailing slash
  // поэтому проверяем contains вместо exact match
  expect(result).toMatch(/href="https:\/\/google\.com\/?"/);
  expect(result).toContain('target="_blank"');
  expect(result).toContain('rel="noopener"');
  expect(result).toContain("Google");
});

  it("blocks javascript: links", () => {
    const result = parseText("[click](javascript:alert(1))");
    expect(result).not.toContain("javascript:");
    expect(result).toContain("click"); // Label preserved
  });

  it("renders list items", () => {
    const result = parseText("- item one\n- item two");
    expect(result).toContain("<ul>");
    expect(result).toContain("<li>item one</li>");
    expect(result).toContain("<li>item two</li>");
  });

  it("converts newlines to <br>", () => {
    const result = parseText("line1\nline2");
    expect(result).toContain("<br>");
  });

  // ── Edge cases ──

  it("returns empty string for null", () => {
    expect(parseText(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(parseText(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(parseText("")).toBe("");
  });

  it("coerces number to string", () => {
    expect(parseText(42 as any)).toContain("42");
  });
});