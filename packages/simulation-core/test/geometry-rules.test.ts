import { describe, expect, test } from "bun:test";
import {
  evaluateSimulation,
  parsePointMm,
  parseRectangleMm,
  segmentIntersectsClosedRectangle,
} from "../src/index.js";
import { createSingleScenarioInput } from "./helpers.js";

const targetBounds = parseRectangleMm({ minXmm: 400, minYmm: 400, maxXmm: 600, maxYmm: 600 });

describe("closed fixed-unit geometry", () => {
  test("detects interior crossings even when both endpoints are outside", () => {
    expect(
      segmentIntersectsClosedRectangle(
        parsePointMm({ xMm: 100, yMm: 500 }),
        parsePointMm({ xMm: 900, yMm: 500 }),
        targetBounds,
      ),
    ).toBe(true);
  });

  test("every edge and corner contact counts as zone presence", () => {
    const boundaryPoints = [
      { xMm: 400, yMm: 400 },
      { xMm: 600, yMm: 400 },
      { xMm: 600, yMm: 600 },
      { xMm: 400, yMm: 600 },
      { xMm: 500, yMm: 400 },
      { xMm: 600, yMm: 500 },
      { xMm: 500, yMm: 600 },
      { xMm: 400, yMm: 500 },
    ];
    for (const point of boundaryPoints) {
      const parsed = parsePointMm(point);
      expect(segmentIntersectsClosedRectangle(parsed, parsed, targetBounds)).toBe(true);
    }
  });

  test("a parallel segment one millimetre outside does not intersect", () => {
    expect(
      segmentIntersectsClosedRectangle(
        parsePointMm({ xMm: 100, yMm: 399 }),
        parsePointMm({ xMm: 900, yMm: 399 }),
        targetBounds,
      ),
    ).toBe(false);
  });

  test.each([
    [{ xMm: 100, yMm: 100 }, { xMm: 400, yMm: 400 }, true],
    [{ xMm: 400, yMm: 400 }, { xMm: 600, yMm: 400 }, true],
    [{ xMm: 500, yMm: 100 }, { xMm: 500, yMm: 900 }, true],
    [{ xMm: 900, yMm: 500 }, { xMm: 100, yMm: 500 }, true],
    [{ xMm: 399, yMm: 399 }, { xMm: 399, yMm: 399 }, false],
  ] as const)("handles adversarial segment %#", (start, end, expected) => {
    expect(
      segmentIntersectsClosedRectangle(parsePointMm(start), parsePointMm(end), targetBounds),
    ).toBe(expected);
  });

  test("stays exact near the maximum supported coordinate", () => {
    const maximumBounds = parseRectangleMm({
      minXmm: 9_999_998,
      minYmm: 9_999_998,
      maxXmm: 10_000_000,
      maxYmm: 10_000_000,
    });
    expect(
      segmentIntersectsClosedRectangle(
        parsePointMm({ xMm: 9_999_997, yMm: 9_999_997 }),
        parsePointMm({ xMm: 10_000_000, yMm: 10_000_000 }),
        maximumBounds,
      ),
    ).toBe(true);
  });
});

describe("restricted-zone rule", () => {
  const rule = { ruleId: "rule:restricted", type: "restricted-zone", zoneId: "zone:target" };

  test("a crossing route fails and a route outside passes", () => {
    const crossing = evaluateSimulation(createSingleScenarioInput({ rules: [rule] }));
    const outside = evaluateSimulation(
      createSingleScenarioInput({
        rules: [rule],
        start: { xMm: 100, yMm: 399 },
        end: { xMm: 900, yMm: 399 },
      }),
    );
    expect(crossing.result.verdict).toBe("HOLD");
    expect(crossing.violations.map((violation) => violation.type)).toEqual(["restricted-zone"]);
    expect(outside.result.verdict).toBe("CLEAR");
    expect(outside.violations).toEqual([]);
  });

  test("touching a closed boundary fails", () => {
    const report = evaluateSimulation(
      createSingleScenarioInput({
        rules: [rule],
        start: { xMm: 100, yMm: 400 },
        end: { xMm: 400, yMm: 400 },
      }),
    );
    expect(report.result.verdict).toBe("HOLD");
  });
});

describe("speed limits", () => {
  const zoneRule = {
    ruleId: "rule:zone-speed",
    type: "zone-speed-limit",
    zoneId: "zone:target",
    maximumMmPerSecond: 600,
  };

  test.each([
    [599, "CLEAR"],
    [600, "CLEAR"],
    [601, "HOLD"],
  ] as const)("zone speed %i has verdict %s", (speed, verdict) => {
    expect(
      evaluateSimulation(createSingleScenarioInput({ rules: [zoneRule], speedMmPerSecond: speed }))
        .result.verdict,
    ).toBe(verdict);
  });

  test("a zone-specific limit does not apply outside its closed zone", () => {
    const report = evaluateSimulation(
      createSingleScenarioInput({
        rules: [zoneRule],
        speedMmPerSecond: 601,
        start: { xMm: 100, yMm: 399 },
        end: { xMm: 900, yMm: 399 },
      }),
    );
    expect(report.result.verdict).toBe("CLEAR");
  });

  test.each([
    [599, "CLEAR"],
    [600, "CLEAR"],
    [601, "HOLD"],
  ] as const)("site speed %i has verdict %s outside named zones", (speed, verdict) => {
    const siteRule = {
      ruleId: "rule:site-speed",
      type: "site-speed-limit",
      maximumMmPerSecond: 600,
    };
    const report = evaluateSimulation(
      createSingleScenarioInput({
        rules: [siteRule],
        speedMmPerSecond: speed,
        start: { xMm: 100, yMm: 100 },
        end: { xMm: 900, yMm: 100 },
      }),
    );
    expect(report.result.verdict).toBe(verdict);
    expect(report.violations.map((violation) => violation.type)).toEqual(
      verdict === "HOLD" ? ["site-speed-limit"] : [],
    );
  });
});

describe("payload restrictions", () => {
  const payloadRule = {
    ruleId: "rule:payload",
    type: "payload-zone-restriction",
    zoneId: "zone:target",
    payloadGreaterThanGrams: 40_000,
  };

  test.each([
    [39_999, "CLEAR"],
    [40_000, "CLEAR"],
    [40_001, "HOLD"],
  ] as const)("payload %i grams has verdict %s", (payload, verdict) => {
    expect(
      evaluateSimulation(createSingleScenarioInput({ rules: [payloadRule], payloadGrams: payload }))
        .result.verdict,
    ).toBe(verdict);
  });

  test("an above-threshold payload outside the named zone passes that rule", () => {
    const report = evaluateSimulation(
      createSingleScenarioInput({
        rules: [payloadRule],
        payloadGrams: 40_001,
        start: { xMm: 100, yMm: 399 },
        end: { xMm: 900, yMm: 399 },
      }),
    );
    expect(report.result.verdict).toBe("CLEAR");
  });
});

describe("combined rules", () => {
  test("all applicable rules report once in stable family order", () => {
    const report = evaluateSimulation(
      createSingleScenarioInput({
        payloadGrams: 50_000,
        speedMmPerSecond: 800,
        rules: [
          {
            ruleId: "rule:payload",
            type: "payload-zone-restriction",
            zoneId: "zone:target",
            payloadGreaterThanGrams: 40_000,
          },
          {
            ruleId: "rule:zone-speed",
            type: "zone-speed-limit",
            zoneId: "zone:target",
            maximumMmPerSecond: 600,
          },
          { ruleId: "rule:restricted", type: "restricted-zone", zoneId: "zone:target" },
          { ruleId: "rule:site-speed", type: "site-speed-limit", maximumMmPerSecond: 700 },
        ],
      }),
    );
    expect(report.violations.map((violation) => violation.type)).toEqual([
      "restricted-zone",
      "site-speed-limit",
      "zone-speed-limit",
      "payload-zone-restriction",
    ]);
    expect(report.violationCount).toBe(4);
    expect(
      report.scenarioResults.map((result) => ({
        ...result,
        scenarioId: String(result.scenarioId),
      })),
    ).toEqual([{ scenarioId: "scenario:single", verdict: "HOLD", violationCount: 4 }]);
  });

  test("rules in the same family are ordered by rule ID, not input order", () => {
    const report = evaluateSimulation(
      createSingleScenarioInput({
        rules: [
          { ruleId: "rule:z", type: "restricted-zone", zoneId: "zone:target" },
          { ruleId: "rule:a", type: "restricted-zone", zoneId: "zone:target" },
        ],
      }),
    );
    expect(report.violations.map((violation) => String(violation.ruleId))).toEqual([
      "rule:a",
      "rule:z",
    ]);
  });
});
