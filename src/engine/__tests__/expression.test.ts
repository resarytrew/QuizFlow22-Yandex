import { describe, expect, it } from "vitest";
import { evaluateArithmetic } from "../expression";

describe("evaluateArithmetic", () => {
  it("evaluates arithmetic with variables and parentheses", () => {
    expect(evaluateArithmetic("(score + bonus) * 2", {
      score: 3,
      bonus: 4,
    })).toBe(14);
  });

  it("rejects unsupported code", () => {
    expect(() => evaluateArithmetic("window.alert(1)", {})).toThrow();
  });
});
