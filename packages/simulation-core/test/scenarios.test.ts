import { describe, expect, test } from "bun:test";
import { canonicalSerialize } from "@preflight/domain";
import {
  createDeterministicDemoFixture,
  generateScenarioSuite,
  parseScenarioSuite,
  xorshift32Sequence,
} from "../src/index.js";

describe("xorshift32 scenario generation", () => {
  test("locks the exact uint32 PRNG sequence", () => {
    expect(xorshift32Sequence(1, 5)).toEqual([
      270_369, 67_634_689, 2_647_435_461, 307_599_695, 2_398_689_233,
    ]);
  });

  test("locks the demo suite content and order", () => {
    expect(JSON.parse(JSON.stringify(createDeterministicDemoFixture().scenarioSuite))).toEqual({
      schemaVersion: "preflight.scenario-suite/v1",
      generatorVersion: "preflight.xorshift32-scenarios/v1",
      seed: 1_592_594_996,
      scenarios: [
        { scenarioId: "scenario:restricted-route", payloadGrams: 19_567 },
        { scenarioId: "scenario:human-zone-speed", payloadGrams: 24_609 },
        { scenarioId: "scenario:heavy-payload-route", payloadGrams: 49_642 },
      ],
    });
  });

  test("same logical config is canonical despite key and template insertion order", () => {
    const config = createDeterministicDemoFixture().confidentialEnvelope.scenarioGeneration;
    const reordered = {
      templates: [...config.templates].reverse().map((template) => ({
        payloadVariationGrams: template.payloadVariationGrams,
        basePayloadGrams: template.basePayloadGrams,
        scenarioId: template.scenarioId,
      })),
      seed: config.seed,
      generatorVersion: config.generatorVersion,
    };
    expect(String(canonicalSerialize(generateScenarioSuite(reordered)))).toBe(
      String(canonicalSerialize(generateScenarioSuite(config))),
    );
  });

  test("different known seeds change generated scenario content", () => {
    const config = createDeterministicDemoFixture().confidentialEnvelope.scenarioGeneration;
    const first = generateScenarioSuite({ ...config, seed: 1 });
    const second = generateScenarioSuite({ ...config, seed: 2 });
    expect(first.scenarios.map((scenario) => scenario.payloadGrams)).not.toEqual(
      second.scenarios.map((scenario) => scenario.payloadGrams),
    );
  });

  test("generation has no retained state and does not mutate its input", () => {
    const config = createDeterministicDemoFixture().confidentialEnvelope.scenarioGeneration;
    const before = String(canonicalSerialize(config));
    const first = generateScenarioSuite(config);
    generateScenarioSuite({ ...config, seed: 2 });
    const third = generateScenarioSuite(config);
    expect(third).toEqual(first);
    expect(String(canonicalSerialize(config))).toBe(before);
  });

  test("representative seeds always produce valid deeply frozen suites", () => {
    const config = createDeterministicDemoFixture().confidentialEnvelope.scenarioGeneration;
    for (let seed = 1; seed <= 128; seed += 1) {
      const suite = generateScenarioSuite({ ...config, seed });
      expect(parseScenarioSuite(suite)).toEqual(suite);
      expect(Object.isFrozen(suite)).toBe(true);
      expect(Object.isFrozen(suite.scenarios)).toBe(true);
      expect(suite.scenarios.every((scenario) => Object.isFrozen(scenario))).toBe(true);
    }
  });
});
