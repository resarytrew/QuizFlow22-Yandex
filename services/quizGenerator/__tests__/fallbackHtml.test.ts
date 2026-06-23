import { describe, it, expect } from "vitest";
import { buildFallbackHtml } from "../fallbackHtml";

describe("buildFallbackHtml", () => {
  it("returns valid HTML document", () => {
    const html = buildFallbackHtml();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("contains default error title", () => {
    const html = buildFallbackHtml();
    expect(html).toContain("Ошибка генерации квиза");
  });

  it("uses custom title", () => {
    const html = buildFallbackHtml("Custom Error");
    expect(html).toContain("Custom Error");
  });

  it("includes detail when provided", () => {
    const html = buildFallbackHtml("Error", "Something went wrong");
    expect(html).toContain("Something went wrong");
  });

  it("excludes detail paragraph when not provided", () => {
    const html = buildFallbackHtml("Error");
    // Should not have an empty <p></p>
    const detailCount = (html.match(/<p>/g) || []).length;
    expect(detailCount).toBe(1); // Only the generic message
  });

  it("escapes HTML in title to prevent XSS", () => {
    const html = buildFallbackHtml('<script>alert("xss")</script>');
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes HTML in detail to prevent XSS", () => {
    const html = buildFallbackHtml("Error", '<img src=x onerror=alert(1)>');
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("contains reload button", () => {
    const html = buildFallbackHtml();
    expect(html).toContain("Перезагрузить");
    expect(html).toContain("location.reload()");
  });

  it("has responsive viewport meta", () => {
    const html = buildFallbackHtml();
    expect(html).toContain("viewport");
    expect(html).toContain("width=device-width");
  });
});