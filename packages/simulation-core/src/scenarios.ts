import {
  type GeneratedScenario,
  parseScenarioGenerationConfig,
  parseScenarioSuite,
  SCENARIO_GENERATOR_VERSION,
  SCENARIO_SUITE_VERSION,
  type ScenarioGenerationConfig,
  type ScenarioSuite,
} from "./model";

/**
 * xorshift32 v1: x ^= x << 13; x ^= x >>> 17; x ^= x << 5; output x >>> 0.
 * Seeds are validated non-zero uint32 values, so the absorbing zero state is unreachable.
 */
export function xorshift32Sequence(seed: number, count: number): readonly number[] {
  const configSeed = parseScenarioGenerationConfig({
    generatorVersion: SCENARIO_GENERATOR_VERSION,
    seed,
    templates: [
      {
        scenarioId: "scenario:seed-validation",
        basePayloadGrams: 0,
        payloadVariationGrams: 0,
      },
    ],
  }).seed;
  if (!Number.isSafeInteger(count) || count < 0 || count > 1024 || Object.is(count, -0)) {
    throw new RangeError("xorshift32 count must be an integer from 0 through 1024");
  }

  let state = configSeed;
  const values: number[] = [];
  for (let index = 0; index < count; index += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    values.push(state);
  }
  return Object.freeze(values);
}

function createXorshift32(seed: number): () => number {
  let state = seed;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state;
  };
}

/** Generates a normalized scenario suite using integer-only payload variation and Fisher-Yates. */
export function generateScenarioSuite(input: unknown): ScenarioSuite {
  const config: ScenarioGenerationConfig = parseScenarioGenerationConfig(input);
  const nextUint32 = createXorshift32(config.seed);
  const scenarios: GeneratedScenario[] = config.templates.map((template) => {
    const variationSpan = template.payloadVariationGrams * 2 + 1;
    const payloadOffset = (nextUint32() % variationSpan) - template.payloadVariationGrams;
    return Object.freeze({
      scenarioId: template.scenarioId,
      payloadGrams: template.basePayloadGrams + payloadOffset,
    }) as GeneratedScenario;
  });

  for (let index = scenarios.length - 1; index > 0; index -= 1) {
    const swapIndex = nextUint32() % (index + 1);
    const current = scenarios[index];
    const replacement = scenarios[swapIndex];
    if (current === undefined || replacement === undefined) {
      throw new Error("Validated scenario permutation became inconsistent");
    }
    scenarios[index] = replacement;
    scenarios[swapIndex] = current;
  }

  return parseScenarioSuite({
    schemaVersion: SCENARIO_SUITE_VERSION,
    generatorVersion: config.generatorVersion,
    seed: config.seed,
    scenarios,
  });
}
