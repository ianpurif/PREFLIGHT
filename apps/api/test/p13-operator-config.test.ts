import { describe, expect, test } from "bun:test";
import { parseP13OperatorPassword } from "../src/p13-operator-config.js";

describe("P13 operator credential validation", () => {
  test("preserves a password's exact value within the API bounds", () => {
    expect(parseP13OperatorPassword("  1234567890  ")).toBe("  1234567890  ");
  });

  test("rejects missing and short credentials without exposing the value", () => {
    expect(() => parseP13OperatorPassword(undefined)).toThrow("ROVAULTA_P13_PASSWORD is required");
    expect(() => parseP13OperatorPassword("too-short")).toThrow(
      /ROVAULTA_P13_PASSWORD must be 12-256 characters/,
    );
    expect(() => parseP13OperatorPassword("too-short")).not.toThrow(/too-short/);
  });

  test("rejects credentials longer than the API maximum", () => {
    expect(() => parseP13OperatorPassword("x".repeat(257))).toThrow(
      /ROVAULTA_P13_PASSWORD must be 12-256 characters/,
    );
  });
});
