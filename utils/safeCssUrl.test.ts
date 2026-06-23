// utils/safeCssUrl.test.ts
//
// Unit tests for safeCssUrl in utils/safeCssUrl.ts. The function
// is the last line of defense between user-supplied imageUrl and
// the CSS url('...') interpolation. A bug here is a CSS-injection
// vector (C-01/C-02 from AUDIT_REPORT.md).
//
// Run with: npm test safeCssUrl

import { describe, expect, it } from "vitest";
import { safeCssUrl } from "./safeCssUrl";

describe("safeCssUrl — happy paths", () => {
  it("accepts an absolute https URL", () => {
    const out = safeCssUrl("https://example.com/img.png");
    expect(out).toBe("https://example.com/img.png");
  });

  it("accepts an absolute http URL", () => {
    const out = safeCssUrl("http://example.com/img.png");
    expect(out).toBe("http://example.com/img.png");
  });

  it("accepts a data:image/png URL", () => {
    const url = "data:image/png;base64,iVBORw0KGgo=";
    expect(safeCssUrl(url)).toBe(url);
  });

  it("accepts a data:image/svg+xml URL", () => {
    const url = "data:image/svg+xml,%3Csvg%3E%3C/svg%3E";
    expect(safeCssUrl(url)).toBe(url);
  });

  it("accepts a data:audio/mpeg URL", () => {
    const url = "data:audio/mpeg;base64,SUQz";
    expect(safeCssUrl(url)).toBe(url);
  });

  it("accepts a data:video/mp4 URL", () => {
    const url = "data:video/mp4;base64,AAAA";
    expect(safeCssUrl(url)).toBe(url);
  });

  it("resolves a relative URL against the supplied base", () => {
    const out = safeCssUrl("/img/bg.png", "https://app.example.com/foo");
    expect(out).toBe("https://app.example.com/img/bg.png");
  });
});

describe("safeCssUrl — protocol rejection", () => {
  it("rejects javascript: URLs", () => {
    expect(safeCssUrl("javascript:alert(1)")).toBeNull();
  });

  it("rejects vbscript: URLs", () => {
    expect(safeCssUrl("vbscript:msgbox(1)")).toBeNull();
  });

  it("rejects data:text/html URLs (XSS vector)", () => {
    expect(
      safeCssUrl("data:text/html,<script>alert(1)</script>"),
    ).toBeNull();
  });

  it("accepts data:image/svg+xml URLs (safe in CSS context)", () => {
    // SVG used as a CSS background-image is rendered as a static
    // image — browsers do not execute embedded <script> in this
    // context. The only SVG vector is when the file is loaded via
    // <iframe>/<object>/<embed>, which is not what we do with
    // imageUrl. We accept it.
    const url = "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=";
    expect(safeCssUrl(url)).toBe(url);
  });

  it("rejects blob: URLs", () => {
    // blob: URLs require the same-origin context to resolve; in
    // generated CSS they would dangle.
    expect(safeCssUrl("blob:https://example.com/uuid")).toBeNull();
  });

  it("rejects mailto: URLs", () => {
    expect(safeCssUrl("mailto:attacker@evil.com")).toBeNull();
  });

  it("rejects filesystem: URLs", () => {
    expect(safeCssUrl("filesystem:https://example.com/temp/x")).toBeNull();
  });
});

describe("safeCssUrl — CSS-context strip", () => {
  it("strips ) that could close url() early", () => {
    // The classic C-01 payload:
    //   image.jpg'); background:url(https://evil.com/...)
    // The `)` would close the CSS url() literal. We strip it.
    const out = safeCssUrl(
      "https://example.com/image.jpg');background:url(https://evil.com/x",
    );
    // After URL parsing, the path includes the ) — we MUST strip it.
    expect(out).not.toContain(")");
    expect(out).not.toContain("'");
    // `;` is intentionally kept (valid sub-delim, not CSS-dangerous
    // inside url('...')). See dedicated `does NOT strip semicolon`
    // test below.
  });

  it("strips single quote", () => {
    const out = safeCssUrl("https://example.com/it's.png");
    // The URL constructor percent-encodes the apostrophe, so
    // the result shouldn't contain a raw '. The CSS strip is
    // belt-and-suspenders.
    expect(out).not.toContain("'");
  });

  it("strips double quote", () => {
    const out = safeCssUrl('https://example.com/img"test.png');
    expect(out).not.toContain('"');
  });

  it("strips backslash", () => {
    const out = safeCssUrl("https://example.com/img\\test.png");
    expect(out).not.toContain("\\");
  });

  it("does NOT strip semicolon in https URL (valid sub-delim, not CSS-dangerous)", () => {
    // `;` is a valid sub-delim per RFC 3986 and is not interpreted
    // as a property separator inside url('...'). Stripping it would
    // corrupt legitimate URLs that use matrix parameters
    // (e.g. /path;type=a) for no security benefit.
    const out = safeCssUrl("https://example.com/x;type=a;.png");
    expect(out).toContain(";");
  });

  it("strips CR and LF (header injection)", () => {
    // newlines in a URL would let an attacker close one CSS rule
    // and start another. new URL() doesn't reject them but the
    // strip does.
    const out = safeCssUrl("https://example.com/x\nbackground:red;.png");
    expect(out).not.toContain("\n");
    expect(out).not.toContain("\r");
  });

  it("strips tab characters", () => {
    const out = safeCssUrl("https://example.com/x\t;.png");
    expect(out).not.toContain("\t");
  });
});

describe("safeCssUrl — malformed input", () => {
  it("returns null for empty string", () => {
    expect(safeCssUrl("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(safeCssUrl(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(safeCssUrl(undefined)).toBeNull();
  });

  it("returns null for a number", () => {
    expect(safeCssUrl(42 as unknown as string)).toBeNull();
  });

  it("returns null for a plain object", () => {
    expect(safeCssUrl({ url: "https://x" } as unknown as string)).toBeNull();
  });

  it("returns null for a bare path without base", () => {
    // /img.png is a valid relative URL — without a base, URL parsing
    // throws. Caller must opt-in to relative resolution by passing a
    // base explicitly.
    expect(safeCssUrl("/img.png")).toBeNull();
  });

  it("returns null for overlong input (>2048 chars)", () => {
    const big = "https://example.com/" + "a".repeat(2100);
    expect(safeCssUrl(big)).toBeNull();
  });

  it("returns null for a non-URL string (no protocol)", () => {
    expect(safeCssUrl("not-a-url")).toBeNull();
  });
});
