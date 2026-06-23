import { describe, it, expect } from "vitest";
import { buildCsp, injectCsp } from "../csp";

describe("buildCsp", () => {
  it("contains default-src 'self'", () => {
    expect(buildCsp()).toContain("default-src 'self'");
  });

  it("contains script-src with CDN allowlist", () => {
    const csp = buildCsp();
    expect(csp).toContain("https://cdn.jsdelivr.net");
    expect(csp).toContain("https://cdnjs.cloudflare.com");
  });

  it("contains object-src 'none'", () => {
    expect(buildCsp()).toContain("object-src 'none'");
  });

  it("contains base-uri 'self'", () => {
    expect(buildCsp()).toContain("base-uri 'self'");
  });

  it("limits frame-src to known video platforms (no wildcard)", () => {
    const csp = buildCsp();

    // Конкретные домены присутствуют
    expect(csp).toContain("frame-src");
    expect(csp).toContain("rutube.ru");
    expect(csp).toContain("youtube.com");

    // Нет wildcard токена "https:" как отдельного значения
    // (т.е. нет "frame-src https:" — только "frame-src https://...")
    const frameSrc = csp
      .split(";")
      .find((d) => d.trim().startsWith("frame-src")) ?? "";

    // Wildcard выглядел бы как "frame-src https:" с пробелом после
    // или в конце строки. Конкретные URL содержат https:// (с двумя слешами)
    expect(frameSrc).not.toMatch(/\bframe-src\s+https:\s/);
    expect(frameSrc).not.toMatch(/\bframe-src\s+https:$/);
  });

  it("includes API origin in connect-src when provided", () => {
    const csp = buildCsp("https://abc.apigw.yandexcloud.net");
    expect(csp).toContain("connect-src 'self' https://abc.apigw.yandexcloud.net");
  });

  it("omits API origin from connect-src when not provided", () => {
    const csp = buildCsp();
    const connectSrc = csp
      .split(";")
      .find((d) => d.trim().startsWith("connect-src")) ?? "";
    expect(connectSrc.trim()).toBe("connect-src 'self'");
  });

  it("does not contain wildcard https: in connect-src", () => {
    const csp = buildCsp();
    const connectSrc = csp
      .split(";")
      .find((d) => d.trim().startsWith("connect-src")) ?? "";
    expect(connectSrc).not.toContain("connect-src 'self' https:");
  });

  it("does not contain wildcard https: as standalone token in frame-src", () => {
    const csp = buildCsp();
    const frameSrc = csp
      .split(";")
      .find((d) => d.trim().startsWith("frame-src")) ?? "";
    expect(frameSrc).not.toMatch(/(?:^|\s)https:(?:\s|$)/);
  });
});

describe("injectCsp", () => {
  it("injects CSP meta into <head>", () => {
    const html =
      "<html><head><title>T</title></head><body></body></html>";
    const result = injectCsp(html);
    expect(result).toContain('http-equiv="Content-Security-Policy"');
  });

  it("does not duplicate CSP when already present", () => {
    const html =
      '<html><head><meta http-equiv="Content-Security-Policy" content="x"></head></html>';
    const result = injectCsp(html);
    const matches = result.match(/Content-Security-Policy/g);
    expect(matches).toHaveLength(1);
  });

  it("is case-insensitive for existing CSP detection", () => {
    const html =
      '<head><meta HTTP-EQUIV="content-security-policy" content="x"></head>';
    const result = injectCsp(html);
    const matches = result.match(/content-security-policy/gi);
    expect(matches).toHaveLength(1);
  });

  it("passes API origin to buildCsp", () => {
    const html = "<html><head></head><body></body></html>";
    const result = injectCsp(html, "https://my.apigw.yandexcloud.net");
    expect(result).toContain("https://my.apigw.yandexcloud.net");
  });
});
