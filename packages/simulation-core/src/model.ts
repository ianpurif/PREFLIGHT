import {
  failProtocol,
  parseRobotBuildDigest,
  parseRobotBuildId,
  parseRobotId,
  parseSafetyEnvelopeId,
  parseSiteId,
  type RobotBuildDigest,
  type RobotBuildId,
  type RobotId,
  type SafetyEnvelopeId,
  type SiteId,
} from "@preflight/domain";

declare const zoneIdBrand: unique symbol;
declare const ruleIdBrand: unique symbol;
declare const scenarioIdBrand: unique symbol;
declare const coordinateBrand: unique symbol;
declare const speedBrand: unique symbol;
declare const payloadBrand: unique symbol;

export type ZoneId = string & { readonly [zoneIdBrand]: "ZoneId" };
export type RuleId = string & { readonly [ruleIdBrand]: "RuleId" };
export type ScenarioId = string & { readonly [scenarioIdBrand]: "ScenarioId" };
export type CoordinateMm = number & { readonly [coordinateBrand]: "CoordinateMm" };
export type SpeedMmPerSecond = number & { readonly [speedBrand]: "SpeedMmPerSecond" };
export type PayloadGrams = number & { readonly [payloadBrand]: "PayloadGrams" };

export const CONFIDENTIAL_EVALUATION_ENVELOPE_VERSION =
  "preflight.confidential-evaluation-envelope/v1" as const;
export const SCENARIO_GENERATOR_VERSION = "preflight.xorshift32-scenarios/v1" as const;
export const SCENARIO_SUITE_VERSION = "preflight.scenario-suite/v1" as const;
export const ROBOT_TRACE_SUITE_VERSION = "preflight.robot-trace-suite/v1" as const;
export const INTERNAL_EVALUATION_REPORT_VERSION =
  "preflight.internal-evaluation-report/v1" as const;
export const WAREHOUSE_EVALUATOR_VERSION = "evaluator-version:warehouse-rules-v1" as const;

export const MAX_ABS_COORDINATE_MM = 10_000_000;
export const MAX_SPEED_MM_PER_SECOND = 1_000_000;
export const MAX_PAYLOAD_GRAMS = 1_000_000_000;
export const MAX_ZONES = 128;
export const MAX_RULES = 16;
export const MAX_SCENARIOS = 16;
export const MAX_TRACE_STEPS = 32;

const LOCAL_IDENTIFIER_TOKEN = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;

type PlainRecord = Record<string, unknown>;

function compareCodeUnits(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function parseLocalIdentifier<Brand extends string>(
  input: unknown,
  prefix: string,
  path: string,
): string & { readonly __brand?: Brand } {
  if (typeof input !== "string") {
    return failProtocol("INVALID_IDENTIFIER", "Simulation identifier must be a string", path);
  }
  const separator = input.indexOf(":");
  const actualPrefix = separator < 0 ? "" : input.slice(0, separator);
  const token = separator < 0 ? "" : input.slice(separator + 1);
  if (actualPrefix !== prefix || !LOCAL_IDENTIFIER_TOKEN.test(token)) {
    return failProtocol(
      "INVALID_IDENTIFIER",
      "Simulation identifier has an invalid prefix or token",
      path,
    );
  }
  return input as string & { readonly __brand?: Brand };
}

export function parseZoneId(input: unknown, path = "zoneId"): ZoneId {
  return parseLocalIdentifier<"ZoneId">(input, "zone", path) as ZoneId;
}

export function parseRuleId(input: unknown, path = "ruleId"): RuleId {
  return parseLocalIdentifier<"RuleId">(input, "rule", path) as RuleId;
}

export function parseScenarioId(input: unknown, path = "scenarioId"): ScenarioId {
  return parseLocalIdentifier<"ScenarioId">(input, "scenario", path) as ScenarioId;
}

function expectDataObject(input: unknown, name: string, path: string): PlainRecord {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return failProtocol("MALFORMED_OBJECT", `${name} must be a plain data object`, path);
  }
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    return failProtocol("MALFORMED_OBJECT", `${name} must be a plain data object`, path);
  }
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key === "symbol") {
      return failProtocol("MALFORMED_OBJECT", `${name} must contain string keys only`, path);
    }
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      return failProtocol("MALFORMED_OBJECT", `${name} must contain data properties only`, path);
    }
  }
  return input as PlainRecord;
}

function expectExactObject(
  input: unknown,
  name: string,
  keys: readonly string[],
  path: string,
): PlainRecord {
  const record = expectDataObject(input, name, path);
  const allowed = new Set(keys);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      return failProtocol("MALFORMED_OBJECT", `${name} contains an unknown field`, path);
    }
  }
  for (const key of keys) {
    if (!Object.hasOwn(record, key)) {
      return failProtocol(
        "MALFORMED_OBJECT",
        `${name} is missing a required field`,
        `${path}.${key}`,
      );
    }
  }
  return record;
}

function expectArray(
  input: unknown,
  name: string,
  path: string,
  maximum: number,
): readonly unknown[] {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) {
    return failProtocol("MALFORMED_OBJECT", `${name} must be an ordinary array`, path);
  }
  if (input.length === 0 || input.length > maximum) {
    return failProtocol("MALFORMED_OBJECT", `${name} has an invalid item count`, path);
  }
  for (let index = 0; index < input.length; index += 1) {
    if (!Object.hasOwn(input, index)) {
      return failProtocol("MALFORMED_OBJECT", `${name} must not be sparse`, path);
    }
  }
  for (const key of Reflect.ownKeys(input)) {
    if (key === "length") continue;
    if (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= input.length) {
      return failProtocol("MALFORMED_OBJECT", `${name} must not have custom properties`, path);
    }
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      return failProtocol("MALFORMED_OBJECT", `${name} must contain data items only`, path);
    }
  }
  return input;
}

function expectInteger(input: unknown, minimum: number, maximum: number, path: string): number {
  if (
    typeof input !== "number" ||
    !Number.isSafeInteger(input) ||
    Object.is(input, -0) ||
    input < minimum ||
    input > maximum
  ) {
    return failProtocol("MALFORMED_OBJECT", "Fixed-unit value is outside its integer range", path);
  }
  return input;
}

function expectVersion(input: unknown, expected: string, name: string, path: string): void {
  if (input !== expected) {
    failProtocol("UNSUPPORTED_VERSION", `${name} version is unsupported`, path);
  }
}

export interface PointMm {
  readonly xMm: CoordinateMm;
  readonly yMm: CoordinateMm;
}

export interface RectangleMm {
  readonly minXmm: CoordinateMm;
  readonly minYmm: CoordinateMm;
  readonly maxXmm: CoordinateMm;
  readonly maxYmm: CoordinateMm;
}

export interface WarehouseZone {
  readonly zoneId: ZoneId;
  readonly bounds: RectangleMm;
}

export interface RestrictedZoneRule {
  readonly ruleId: RuleId;
  readonly type: "restricted-zone";
  readonly zoneId: ZoneId;
}

export interface SiteSpeedLimitRule {
  readonly ruleId: RuleId;
  readonly type: "site-speed-limit";
  readonly maximumMmPerSecond: SpeedMmPerSecond;
}

export interface ZoneSpeedLimitRule {
  readonly ruleId: RuleId;
  readonly type: "zone-speed-limit";
  readonly zoneId: ZoneId;
  readonly maximumMmPerSecond: SpeedMmPerSecond;
}

export interface PayloadZoneRestrictionRule {
  readonly ruleId: RuleId;
  readonly type: "payload-zone-restriction";
  readonly zoneId: ZoneId;
  readonly payloadGreaterThanGrams: PayloadGrams;
}

export type SafetyRule =
  | RestrictedZoneRule
  | SiteSpeedLimitRule
  | ZoneSpeedLimitRule
  | PayloadZoneRestrictionRule;

export interface ScenarioTemplate {
  readonly scenarioId: ScenarioId;
  readonly basePayloadGrams: PayloadGrams;
  readonly payloadVariationGrams: PayloadGrams;
}

export interface ScenarioGenerationConfig {
  readonly generatorVersion: typeof SCENARIO_GENERATOR_VERSION;
  readonly seed: number;
  readonly templates: readonly ScenarioTemplate[];
}

export interface ConfidentialEvaluationEnvelope {
  readonly schemaVersion: typeof CONFIDENTIAL_EVALUATION_ENVELOPE_VERSION;
  readonly siteId: SiteId;
  readonly safetyEnvelopeId: SafetyEnvelopeId;
  readonly warehouseBounds: RectangleMm;
  readonly zones: readonly WarehouseZone[];
  readonly rules: readonly SafetyRule[];
  readonly scenarioGeneration: ScenarioGenerationConfig;
}

export interface GeneratedScenario {
  readonly scenarioId: ScenarioId;
  readonly payloadGrams: PayloadGrams;
}

export interface ScenarioSuite {
  readonly schemaVersion: typeof SCENARIO_SUITE_VERSION;
  readonly generatorVersion: typeof SCENARIO_GENERATOR_VERSION;
  readonly seed: number;
  readonly scenarios: readonly GeneratedScenario[];
}

export interface RobotTraceStep {
  readonly stepIndex: number;
  readonly position: PointMm;
  readonly speedMmPerSecond: SpeedMmPerSecond;
}

export interface RobotBehaviorTrace {
  readonly scenarioId: ScenarioId;
  readonly steps: readonly RobotTraceStep[];
}

/** Materialized fixture/model output. P2 validates this data but does not prove its provenance. */
export interface RobotBehaviorTraceSuite {
  readonly schemaVersion: typeof ROBOT_TRACE_SUITE_VERSION;
  readonly robotId: RobotId;
  readonly robotBuildId: RobotBuildId;
  readonly robotBuildDigest: RobotBuildDigest;
  readonly traces: readonly RobotBehaviorTrace[];
}

function parseCoordinate(input: unknown, path: string): CoordinateMm {
  return expectInteger(input, -MAX_ABS_COORDINATE_MM, MAX_ABS_COORDINATE_MM, path) as CoordinateMm;
}

function parseSpeed(input: unknown, path: string): SpeedMmPerSecond {
  return expectInteger(input, 0, MAX_SPEED_MM_PER_SECOND, path) as SpeedMmPerSecond;
}

function parsePayload(input: unknown, path: string): PayloadGrams {
  return expectInteger(input, 0, MAX_PAYLOAD_GRAMS, path) as PayloadGrams;
}

export function parsePointMm(input: unknown, path = "point"): PointMm {
  const record = expectExactObject(input, "PointMm", ["xMm", "yMm"], path);
  return Object.freeze({
    xMm: parseCoordinate(record.xMm, `${path}.xMm`),
    yMm: parseCoordinate(record.yMm, `${path}.yMm`),
  });
}

export function parseRectangleMm(input: unknown, path = "rectangle"): RectangleMm {
  const record = expectExactObject(
    input,
    "RectangleMm",
    ["minXmm", "minYmm", "maxXmm", "maxYmm"],
    path,
  );
  const rectangle = {
    minXmm: parseCoordinate(record.minXmm, `${path}.minXmm`),
    minYmm: parseCoordinate(record.minYmm, `${path}.minYmm`),
    maxXmm: parseCoordinate(record.maxXmm, `${path}.maxXmm`),
    maxYmm: parseCoordinate(record.maxYmm, `${path}.maxYmm`),
  };
  if (rectangle.minXmm >= rectangle.maxXmm || rectangle.minYmm >= rectangle.maxYmm) {
    return failProtocol("MALFORMED_OBJECT", "Rectangle must have positive width and height", path);
  }
  return Object.freeze(rectangle);
}

function rectangleContainsRectangle(outer: RectangleMm, inner: RectangleMm): boolean {
  return (
    inner.minXmm >= outer.minXmm &&
    inner.maxXmm <= outer.maxXmm &&
    inner.minYmm >= outer.minYmm &&
    inner.maxYmm <= outer.maxYmm
  );
}

function parseZone(input: unknown, path: string): WarehouseZone {
  const record = expectExactObject(input, "WarehouseZone", ["zoneId", "bounds"], path);
  return Object.freeze({
    zoneId: parseZoneId(record.zoneId, `${path}.zoneId`),
    bounds: parseRectangleMm(record.bounds, `${path}.bounds`),
  });
}

export const RULE_FAMILY_RANK = Object.freeze({
  "restricted-zone": 0,
  "site-speed-limit": 1,
  "zone-speed-limit": 2,
  "payload-zone-restriction": 3,
} as const);

function parseRule(input: unknown, path: string): SafetyRule {
  const base = expectDataObject(input, "SafetyRule", path);
  const ruleId = parseRuleId(base.ruleId, `${path}.ruleId`);
  switch (base.type) {
    case "restricted-zone": {
      const record = expectExactObject(
        input,
        "RestrictedZoneRule",
        ["ruleId", "type", "zoneId"],
        path,
      );
      return Object.freeze({
        ruleId,
        type: "restricted-zone",
        zoneId: parseZoneId(record.zoneId, `${path}.zoneId`),
      });
    }
    case "site-speed-limit": {
      const record = expectExactObject(
        input,
        "SiteSpeedLimitRule",
        ["ruleId", "type", "maximumMmPerSecond"],
        path,
      );
      return Object.freeze({
        ruleId,
        type: "site-speed-limit",
        maximumMmPerSecond: parseSpeed(record.maximumMmPerSecond, `${path}.maximumMmPerSecond`),
      });
    }
    case "zone-speed-limit": {
      const record = expectExactObject(
        input,
        "ZoneSpeedLimitRule",
        ["ruleId", "type", "zoneId", "maximumMmPerSecond"],
        path,
      );
      return Object.freeze({
        ruleId,
        type: "zone-speed-limit",
        zoneId: parseZoneId(record.zoneId, `${path}.zoneId`),
        maximumMmPerSecond: parseSpeed(record.maximumMmPerSecond, `${path}.maximumMmPerSecond`),
      });
    }
    case "payload-zone-restriction": {
      const record = expectExactObject(
        input,
        "PayloadZoneRestrictionRule",
        ["ruleId", "type", "zoneId", "payloadGreaterThanGrams"],
        path,
      );
      return Object.freeze({
        ruleId,
        type: "payload-zone-restriction",
        zoneId: parseZoneId(record.zoneId, `${path}.zoneId`),
        payloadGreaterThanGrams: parsePayload(
          record.payloadGreaterThanGrams,
          `${path}.payloadGreaterThanGrams`,
        ),
      });
    }
    default:
      return failProtocol("MALFORMED_OBJECT", "Safety rule type is unsupported", `${path}.type`);
  }
}

function parseScenarioTemplate(input: unknown, path: string): ScenarioTemplate {
  const record = expectExactObject(
    input,
    "ScenarioTemplate",
    ["scenarioId", "basePayloadGrams", "payloadVariationGrams"],
    path,
  );
  const basePayloadGrams = parsePayload(record.basePayloadGrams, `${path}.basePayloadGrams`);
  const payloadVariationGrams = parsePayload(
    record.payloadVariationGrams,
    `${path}.payloadVariationGrams`,
  );
  if (
    payloadVariationGrams > basePayloadGrams ||
    basePayloadGrams + payloadVariationGrams > MAX_PAYLOAD_GRAMS
  ) {
    return failProtocol(
      "MALFORMED_OBJECT",
      "Scenario payload variation exceeds the supported range",
      path,
    );
  }
  return Object.freeze({
    scenarioId: parseScenarioId(record.scenarioId, `${path}.scenarioId`),
    basePayloadGrams,
    payloadVariationGrams,
  });
}

function assertUniqueIds(values: readonly string[], name: string, path: string): void {
  if (new Set(values).size !== values.length) {
    failProtocol("MALFORMED_OBJECT", `${name} identifiers must be unique`, path);
  }
}

export function parseScenarioGenerationConfig(
  input: unknown,
  path = "scenarioGeneration",
): ScenarioGenerationConfig {
  const record = expectExactObject(
    input,
    "ScenarioGenerationConfig",
    ["generatorVersion", "seed", "templates"],
    path,
  );
  expectVersion(
    record.generatorVersion,
    SCENARIO_GENERATOR_VERSION,
    "Scenario generator",
    `${path}.generatorVersion`,
  );
  const templates = expectArray(
    record.templates,
    "Scenario templates",
    `${path}.templates`,
    MAX_SCENARIOS,
  )
    .map((template, index) => parseScenarioTemplate(template, `${path}.templates[${index}]`))
    .sort((left, right) => compareCodeUnits(left.scenarioId, right.scenarioId));
  assertUniqueIds(
    templates.map((template) => template.scenarioId),
    "Scenario template",
    `${path}.templates`,
  );
  return Object.freeze({
    generatorVersion: SCENARIO_GENERATOR_VERSION,
    seed: expectInteger(record.seed, 1, 0xffffffff, `${path}.seed`),
    templates: Object.freeze(templates),
  });
}

export function parseConfidentialEvaluationEnvelope(
  input: unknown,
): ConfidentialEvaluationEnvelope {
  const path = "confidentialEnvelope";
  const record = expectExactObject(
    input,
    "ConfidentialEvaluationEnvelope",
    [
      "schemaVersion",
      "siteId",
      "safetyEnvelopeId",
      "warehouseBounds",
      "zones",
      "rules",
      "scenarioGeneration",
    ],
    path,
  );
  expectVersion(
    record.schemaVersion,
    CONFIDENTIAL_EVALUATION_ENVELOPE_VERSION,
    "Confidential evaluation envelope",
    `${path}.schemaVersion`,
  );
  const warehouseBounds = parseRectangleMm(record.warehouseBounds, `${path}.warehouseBounds`);
  const zones = expectArray(record.zones, "Warehouse zones", `${path}.zones`, MAX_ZONES)
    .map((zone, index) => parseZone(zone, `${path}.zones[${index}]`))
    .sort((left, right) => compareCodeUnits(left.zoneId, right.zoneId));
  assertUniqueIds(
    zones.map((zone) => zone.zoneId),
    "Zone",
    `${path}.zones`,
  );
  for (const zone of zones) {
    if (!rectangleContainsRectangle(warehouseBounds, zone.bounds)) {
      return failProtocol(
        "MALFORMED_OBJECT",
        "Warehouse zone must be inside warehouse bounds",
        `${path}.zones`,
      );
    }
  }

  const rules = expectArray(record.rules, "Safety rules", `${path}.rules`, MAX_RULES)
    .map((rule, index) => parseRule(rule, `${path}.rules[${index}]`))
    .sort((left, right) => {
      const rankDifference = RULE_FAMILY_RANK[left.type] - RULE_FAMILY_RANK[right.type];
      return rankDifference === 0 ? compareCodeUnits(left.ruleId, right.ruleId) : rankDifference;
    });
  assertUniqueIds(
    rules.map((rule) => rule.ruleId),
    "Rule",
    `${path}.rules`,
  );
  const zoneIds = new Set(zones.map((zone) => zone.zoneId));
  for (const rule of rules) {
    if (rule.type !== "site-speed-limit" && !zoneIds.has(rule.zoneId)) {
      return failProtocol(
        "MALFORMED_OBJECT",
        "Safety rule references an unknown zone",
        `${path}.rules`,
      );
    }
  }

  return Object.freeze({
    schemaVersion: CONFIDENTIAL_EVALUATION_ENVELOPE_VERSION,
    siteId: parseSiteId(record.siteId),
    safetyEnvelopeId: parseSafetyEnvelopeId(record.safetyEnvelopeId),
    warehouseBounds,
    zones: Object.freeze(zones),
    rules: Object.freeze(rules),
    scenarioGeneration: parseScenarioGenerationConfig(record.scenarioGeneration),
  });
}

/** Exact confidential payload committed by P1, excluding its separately framed public IDs. */
export function confidentialEnvelopeCommitmentPayload(
  envelope: ConfidentialEvaluationEnvelope,
): Readonly<Omit<ConfidentialEvaluationEnvelope, "siteId" | "safetyEnvelopeId">> {
  return Object.freeze({
    schemaVersion: envelope.schemaVersion,
    warehouseBounds: envelope.warehouseBounds,
    zones: envelope.zones,
    rules: envelope.rules,
    scenarioGeneration: envelope.scenarioGeneration,
  });
}

function parseGeneratedScenario(input: unknown, path: string): GeneratedScenario {
  const record = expectExactObject(
    input,
    "GeneratedScenario",
    ["scenarioId", "payloadGrams"],
    path,
  );
  return Object.freeze({
    scenarioId: parseScenarioId(record.scenarioId, `${path}.scenarioId`),
    payloadGrams: parsePayload(record.payloadGrams, `${path}.payloadGrams`),
  });
}

export function parseScenarioSuite(input: unknown): ScenarioSuite {
  const path = "scenarioSuite";
  const record = expectExactObject(
    input,
    "ScenarioSuite",
    ["schemaVersion", "generatorVersion", "seed", "scenarios"],
    path,
  );
  expectVersion(
    record.schemaVersion,
    SCENARIO_SUITE_VERSION,
    "Scenario suite",
    `${path}.schemaVersion`,
  );
  expectVersion(
    record.generatorVersion,
    SCENARIO_GENERATOR_VERSION,
    "Scenario generator",
    `${path}.generatorVersion`,
  );
  const scenarios = expectArray(
    record.scenarios,
    "Generated scenarios",
    `${path}.scenarios`,
    MAX_SCENARIOS,
  ).map((scenario, index) => parseGeneratedScenario(scenario, `${path}.scenarios[${index}]`));
  assertUniqueIds(
    scenarios.map((scenario) => scenario.scenarioId),
    "Scenario",
    `${path}.scenarios`,
  );
  return Object.freeze({
    schemaVersion: SCENARIO_SUITE_VERSION,
    generatorVersion: SCENARIO_GENERATOR_VERSION,
    seed: expectInteger(record.seed, 1, 0xffffffff, `${path}.seed`),
    scenarios: Object.freeze(scenarios),
  });
}

function parseTraceStep(input: unknown, path: string): RobotTraceStep {
  const record = expectExactObject(
    input,
    "RobotTraceStep",
    ["stepIndex", "position", "speedMmPerSecond"],
    path,
  );
  return Object.freeze({
    stepIndex: expectInteger(record.stepIndex, 0, MAX_TRACE_STEPS - 1, `${path}.stepIndex`),
    position: parsePointMm(record.position, `${path}.position`),
    speedMmPerSecond: parseSpeed(record.speedMmPerSecond, `${path}.speedMmPerSecond`),
  });
}

function parseBehaviorTrace(input: unknown, path: string): RobotBehaviorTrace {
  const record = expectExactObject(input, "RobotBehaviorTrace", ["scenarioId", "steps"], path);
  const steps = expectArray(
    record.steps,
    "Robot trace steps",
    `${path}.steps`,
    MAX_TRACE_STEPS,
  ).map((step, index) => {
    const parsed = parseTraceStep(step, `${path}.steps[${index}]`);
    if (parsed.stepIndex !== index) {
      return failProtocol(
        "MALFORMED_OBJECT",
        "Robot trace step indexes must be contiguous and ordered from zero",
        `${path}.steps[${index}].stepIndex`,
      );
    }
    return parsed;
  });
  return Object.freeze({
    scenarioId: parseScenarioId(record.scenarioId, `${path}.scenarioId`),
    steps: Object.freeze(steps),
  });
}

export function parseRobotBehaviorTraces(
  input: unknown,
  path = "behaviorTraces.traces",
): readonly RobotBehaviorTrace[] {
  const traces = expectArray(input, "Robot behavior traces", path, MAX_SCENARIOS)
    .map((trace, index) => parseBehaviorTrace(trace, `${path}[${index}]`))
    .sort((left, right) => compareCodeUnits(left.scenarioId, right.scenarioId));
  assertUniqueIds(
    traces.map((trace) => trace.scenarioId),
    "Robot trace scenario",
    path,
  );
  return Object.freeze(traces);
}

export function parseRobotBehaviorTraceSuite(input: unknown): RobotBehaviorTraceSuite {
  const path = "behaviorTraces";
  const record = expectExactObject(
    input,
    "RobotBehaviorTraceSuite",
    ["schemaVersion", "robotId", "robotBuildId", "robotBuildDigest", "traces"],
    path,
  );
  expectVersion(
    record.schemaVersion,
    ROBOT_TRACE_SUITE_VERSION,
    "Robot trace suite",
    `${path}.schemaVersion`,
  );
  const traces = parseRobotBehaviorTraces(record.traces, `${path}.traces`);
  return Object.freeze({
    schemaVersion: ROBOT_TRACE_SUITE_VERSION,
    robotId: parseRobotId(record.robotId),
    robotBuildId: parseRobotBuildId(record.robotBuildId),
    robotBuildDigest: parseRobotBuildDigest(record.robotBuildDigest),
    traces,
  });
}

export { compareCodeUnits };
