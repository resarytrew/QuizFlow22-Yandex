import { describe, it, expect } from "vitest";
import { getApiBaseUrl, getApiOrigin } from "../env";

describe("env", () => {
  describe("getApiBaseUrl", () => {
    it("returns undefined when API URL is missing", () => {
      expect(getApiBaseUrl({ apiUrl: "" })).toBeUndefined();
    });

    it("trims whitespace and trailing slash", () => {
      expect(getApiBaseUrl({ apiUrl: "  https://api.example.com/api/  " })).toBe(
        "https://api.example.com/api",
      );
    });
  });

  describe("getApiOrigin", () => {
    it("extracts origin from API URL", () => {
      expect(getApiOrigin({ apiUrl: "https://abc.apigw.yandexcloud.net/api" })).toBe(
        "https://abc.apigw.yandexcloud.net",
      );
    });

    it("returns empty string when URL is missing", () => {
      expect(getApiOrigin({ apiUrl: "" })).toBe("");
    });

    it("returns empty string for invalid URL", () => {
      expect(getApiOrigin({ apiUrl: "not a url" })).toBe("");
    });
  });
});
