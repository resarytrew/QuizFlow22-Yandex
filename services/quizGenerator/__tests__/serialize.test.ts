import { describe, it, expect } from "vitest";
import { serializeForHtmlScript, serializeForJsonBlock } from "../serialize";

describe("serializeForHtmlScript", () => {
  it("serializes simple object", () => {
    const result = serializeForHtmlScript({ a: 1, b: "hello" });
    expect(JSON.parse(result.replace(/\\u003c/g, '<').replace(/\\u003e/g, '>'))).toEqual({ a: 1, b: "hello" });
  });

  it("escapes < to prevent </script> injection", () => {
    const result = serializeForHtmlScript({ text: "</script><script>alert(1)" });
    expect(result).not.toContain("</script>");
    expect(result).toContain("\\u003c");
  });

  it("escapes > to prevent tag closing", () => {
    const result = serializeForHtmlScript({ text: "a > b" });
    expect(result).toContain("\\u003e");
  });

  it("escapes & to prevent entity injection", () => {
    const result = serializeForHtmlScript({ text: "a & b" });
    expect(result).toContain("\\u0026");
  });

  it("escapes U+2028 (Line Separator)", () => {
    const result = serializeForHtmlScript({ text: "a\u2028b" });
    expect(result).toContain("\\u2028");
    expect(result).not.toContain("\u2028");
  });

  it("escapes U+2029 (Paragraph Separator)", () => {
    const result = serializeForHtmlScript({ text: "a\u2029b" });
    expect(result).toContain("\\u2029");
  });

  it("handles nested objects", () => {
    const result = serializeForHtmlScript({
      nodes: [{ data: { title: "<b>Bold</b>" } }],
    });
    expect(result).not.toContain("<b>");
    expect(result).toContain("\\u003cb\\u003e");
  });

  it("handles empty object", () => {
    expect(serializeForHtmlScript({})).toBe("{}");
  });

  it("handles null", () => {
    expect(serializeForHtmlScript(null)).toBe("null");
  });

  it("handles array", () => {
    const result = serializeForHtmlScript([1, 2, 3]);
    expect(result).toBe("[1,2,3]");
  });

  it("throws on circular reference", () => {
    const obj: any = {};
    obj.self = obj;
    expect(() => serializeForHtmlScript(obj)).toThrow();
  });

  it("throws on undefined (JSON.stringify returns undefined)", () => {
    expect(() => serializeForHtmlScript(undefined)).toThrow(/not serializable/);
  });
});

describe("serializeForJsonBlock", () => {
  it("produces same output as serializeForHtmlScript", () => {
    const data = { key: "</script>" };
    expect(serializeForJsonBlock(data)).toBe(serializeForHtmlScript(data));
  });
});