import {
  assertEvaluationInputBindings,
  assertEvaluationResultBindings,
  type CanonicalJson,
  canonicalSerialize,
  digestEvaluationInputs,
  digestRobotBuild,
  digestSafetyEnvelopeCommitment,
  EVALUATION_RESULT_SCHEMA_VERSION,
  type EvaluationResult,
  failProtocol,
  parseEvaluationRequest,
  parseEvaluationResult,
  parseRobotBuildDescriptor,
  parseSafetyEnvelopeMetadata,
  parseUnixTimestamp,
  type RobotBuildDescriptor,
  SAFETY_ENVELOPE_METADATA_SCHEMA_VERSION,
  type UnixTimestamp,
} from "@rovaulta/domain";
import {
  type ConfidentialEvaluationEnvelope,
  confidentialEnvelopeCommitmentPayload,
  type GeneratedScenario,
  INTERNAL_EVALUATION_REPORT_VERSION,
  type PointMm,
  parseConfidentialEvaluationEnvelope,
  parseRobotBehaviorTraceSuite,
  type RectangleMm,
  type RobotBehaviorTrace,
  type RobotTraceStep,
  RULE_FAMILY_RANK,
  type RuleId,
  type SafetyRule,
  type ScenarioId,
  WAREHOUSE_EVALUATOR_VERSION,
  type WarehouseZone,
} from "./model";
import { generateScenarioSuite } from "./scenarios";

export interface PointObservation {
  readonly kind: "point";
  readonly stepIndex: number;
  readonly position: PointMm;
}

export interface SegmentObservation {
  readonly kind: "segment";
  /** The speed on this observation is the arrival step's declared segment speed. */
  readonly stepIndex: number;
  readonly from: PointMm;
  readonly to: PointMm;
}

export type RuleObservation = PointObservation | SegmentObservation;

interface ViolationBase {
  readonly scenarioId: ScenarioId;
  readonly ruleId: RuleId;
  readonly observation: RuleObservation;
}

export interface RestrictedZoneViolation extends ViolationBase {
  readonly type: "restricted-zone";
  readonly zoneId: WarehouseZone["zoneId"];
  readonly allowedCondition: "zone-entry-prohibited";
}

export interface SiteSpeedLimitViolation extends ViolationBase {
  readonly type: "site-speed-limit";
  readonly observedMmPerSecond: number;
  readonly maximumMmPerSecond: number;
}

export interface ZoneSpeedLimitViolation extends ViolationBase {
  readonly type: "zone-speed-limit";
  readonly zoneId: WarehouseZone["zoneId"];
  readonly observedMmPerSecond: number;
  readonly maximumMmPerSecond: number;
}

export interface PayloadZoneRestrictionViolation extends ViolationBase {
  readonly type: "payload-zone-restriction";
  readonly zoneId: WarehouseZone["zoneId"];
  readonly observedPayloadGrams: number;
  readonly payloadGreaterThanGrams: number;
  readonly allowedCondition: "payload-at-or-below-threshold-when-entering-zone";
}

export type RuleViolation =
  | RestrictedZoneViolation
  | SiteSpeedLimitViolation
  | ZoneSpeedLimitViolation
  | PayloadZoneRestrictionViolation;

export interface ScenarioEvaluationSummary {
  readonly scenarioId: ScenarioId;
  readonly verdict: "CLEAR" | "HOLD";
  readonly violationCount: number;
}

/** Full P2 evidence. P3 must keep this inside its confidential boundary and filter separately. */
export interface InternalEvaluationReport {
  readonly schemaVersion: typeof INTERNAL_EVALUATION_REPORT_VERSION;
  readonly result: EvaluationResult;
  readonly scenarioCount: number;
  readonly violationCount: number;
  readonly scenarioResults: readonly ScenarioEvaluationSummary[];
  readonly violations: readonly RuleViolation[];
}

export interface SimulationEvaluationInput {
  readonly request: unknown;
  readonly robotBuild: unknown;
  readonly confidentialEnvelope: unknown;
  readonly envelopeBlindingSecret: Uint8Array;
  readonly behaviorTraces: unknown;
  readonly evaluatedAt: unknown;
}

function expectEvaluationInput(input: unknown): SimulationEvaluationInput {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return failProtocol("MALFORMED_OBJECT", "Simulation evaluation input must be a data object");
  }
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    return failProtocol("MALFORMED_OBJECT", "Simulation evaluation input must be a data object");
  }
  const required = [
    "request",
    "robotBuild",
    "confidentialEnvelope",
    "envelopeBlindingSecret",
    "behaviorTraces",
    "evaluatedAt",
  ] as const;
  const allowed = new Set(required);
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string" || !allowed.has(key as (typeof required)[number])) {
      return failProtocol("MALFORMED_OBJECT", "Simulation evaluation input has an unknown field");
    }
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      return failProtocol("MALFORMED_OBJECT", "Simulation evaluation input must use data fields");
    }
  }
  for (const key of required) {
    if (!Object.hasOwn(input, key)) {
      return failProtocol(
        "MALFORMED_OBJECT",
        "Simulation evaluation input is missing a field",
        key,
      );
    }
  }
  return input as unknown as SimulationEvaluationInput;
}

function pointInsideClosedRectangle(point: PointMm, rectangle: RectangleMm): boolean {
  return (
    point.xMm >= rectangle.minXmm &&
    point.xMm <= rectangle.maxXmm &&
    point.yMm >= rectangle.minYmm &&
    point.yMm <= rectangle.maxYmm
  );
}

function orientation(first: PointMm, second: PointMm, third: PointMm): number {
  return (
    (second.xMm - first.xMm) * (third.yMm - first.yMm) -
    (second.yMm - first.yMm) * (third.xMm - first.xMm)
  );
}

function pointOnClosedSegment(point: PointMm, start: PointMm, end: PointMm): boolean {
  return (
    orientation(start, end, point) === 0 &&
    point.xMm >= Math.min(start.xMm, end.xMm) &&
    point.xMm <= Math.max(start.xMm, end.xMm) &&
    point.yMm >= Math.min(start.yMm, end.yMm) &&
    point.yMm <= Math.max(start.yMm, end.yMm)
  );
}

function segmentsIntersectClosed(
  firstStart: PointMm,
  firstEnd: PointMm,
  secondStart: PointMm,
  secondEnd: PointMm,
): boolean {
  const firstOrientation = orientation(firstStart, firstEnd, secondStart);
  const secondOrientation = orientation(firstStart, firstEnd, secondEnd);
  const thirdOrientation = orientation(secondStart, secondEnd, firstStart);
  const fourthOrientation = orientation(secondStart, secondEnd, firstEnd);

  if (
    ((firstOrientation > 0 && secondOrientation < 0) ||
      (firstOrientation < 0 && secondOrientation > 0)) &&
    ((thirdOrientation > 0 && fourthOrientation < 0) ||
      (thirdOrientation < 0 && fourthOrientation > 0))
  ) {
    return true;
  }
  return (
    (firstOrientation === 0 && pointOnClosedSegment(secondStart, firstStart, firstEnd)) ||
    (secondOrientation === 0 && pointOnClosedSegment(secondEnd, firstStart, firstEnd)) ||
    (thirdOrientation === 0 && pointOnClosedSegment(firstStart, secondStart, secondEnd)) ||
    (fourthOrientation === 0 && pointOnClosedSegment(firstEnd, secondStart, secondEnd))
  );
}

/** Exact integer test for a point-sized robot path against a closed axis-aligned rectangle. */
export function segmentIntersectsClosedRectangle(
  start: PointMm,
  end: PointMm,
  rectangle: RectangleMm,
): boolean {
  if (pointInsideClosedRectangle(start, rectangle) || pointInsideClosedRectangle(end, rectangle)) {
    return true;
  }
  const bottomLeft = { xMm: rectangle.minXmm, yMm: rectangle.minYmm } as PointMm;
  const bottomRight = { xMm: rectangle.maxXmm, yMm: rectangle.minYmm } as PointMm;
  const topRight = { xMm: rectangle.maxXmm, yMm: rectangle.maxYmm } as PointMm;
  const topLeft = { xMm: rectangle.minXmm, yMm: rectangle.maxYmm } as PointMm;
  return (
    segmentsIntersectClosed(start, end, bottomLeft, bottomRight) ||
    segmentsIntersectClosed(start, end, bottomRight, topRight) ||
    segmentsIntersectClosed(start, end, topRight, topLeft) ||
    segmentsIntersectClosed(start, end, topLeft, bottomLeft)
  );
}

function observationForStep(steps: readonly RobotTraceStep[], stepIndex: number): RuleObservation {
  const step = steps[stepIndex];
  if (step === undefined) throw new Error("Validated trace step is missing");
  if (stepIndex === 0) {
    return Object.freeze({ kind: "point", stepIndex, position: step.position });
  }
  const previous = steps[stepIndex - 1];
  if (previous === undefined) throw new Error("Validated previous trace step is missing");
  return Object.freeze({
    kind: "segment",
    stepIndex,
    from: previous.position,
    to: step.position,
  });
}

function observationIntersectsZone(
  steps: readonly RobotTraceStep[],
  stepIndex: number,
  zone: WarehouseZone,
): boolean {
  const step = steps[stepIndex];
  if (step === undefined) throw new Error("Validated trace step is missing");
  if (stepIndex === 0) return pointInsideClosedRectangle(step.position, zone.bounds);
  const previous = steps[stepIndex - 1];
  if (previous === undefined) throw new Error("Validated previous trace step is missing");
  return segmentIntersectsClosedRectangle(previous.position, step.position, zone.bounds);
}

function freezeViolation(violation: RuleViolation): RuleViolation {
  return Object.freeze(violation);
}

function evaluateRule(
  rule: SafetyRule,
  scenario: GeneratedScenario,
  trace: RobotBehaviorTrace,
  stepIndex: number,
  zones: ReadonlyMap<string, WarehouseZone>,
): RuleViolation | null {
  const step = trace.steps[stepIndex];
  if (step === undefined) throw new Error("Validated trace step is missing");
  const observation = observationForStep(trace.steps, stepIndex);
  if (rule.type === "site-speed-limit") {
    if (step.speedMmPerSecond <= rule.maximumMmPerSecond) return null;
    return freezeViolation({
      scenarioId: scenario.scenarioId,
      ruleId: rule.ruleId,
      type: "site-speed-limit",
      observation,
      observedMmPerSecond: step.speedMmPerSecond,
      maximumMmPerSecond: rule.maximumMmPerSecond,
    });
  }

  const zone = zones.get(rule.zoneId);
  if (zone === undefined) throw new Error("Validated rule zone is missing");
  if (!observationIntersectsZone(trace.steps, stepIndex, zone)) return null;

  if (rule.type === "restricted-zone") {
    return freezeViolation({
      scenarioId: scenario.scenarioId,
      ruleId: rule.ruleId,
      type: "restricted-zone",
      zoneId: rule.zoneId,
      observation,
      allowedCondition: "zone-entry-prohibited",
    });
  }
  if (rule.type === "zone-speed-limit") {
    if (step.speedMmPerSecond <= rule.maximumMmPerSecond) return null;
    return freezeViolation({
      scenarioId: scenario.scenarioId,
      ruleId: rule.ruleId,
      type: "zone-speed-limit",
      zoneId: rule.zoneId,
      observation,
      observedMmPerSecond: step.speedMmPerSecond,
      maximumMmPerSecond: rule.maximumMmPerSecond,
    });
  }
  if (scenario.payloadGrams <= rule.payloadGreaterThanGrams) return null;
  return freezeViolation({
    scenarioId: scenario.scenarioId,
    ruleId: rule.ruleId,
    type: "payload-zone-restriction",
    zoneId: rule.zoneId,
    observation,
    observedPayloadGrams: scenario.payloadGrams,
    payloadGreaterThanGrams: rule.payloadGreaterThanGrams,
    allowedCondition: "payload-at-or-below-threshold-when-entering-zone",
  });
}

function assertTraceInsideWarehouse(
  trace: RobotBehaviorTrace,
  envelope: ConfidentialEvaluationEnvelope,
): void {
  for (const step of trace.steps) {
    if (!pointInsideClosedRectangle(step.position, envelope.warehouseBounds)) {
      failProtocol(
        "MALFORMED_OBJECT",
        "Robot trace position must remain inside warehouse bounds",
        "behaviorTraces.traces.steps.position",
      );
    }
  }
}

function assertStringBinding(actual: string, expected: string, path: string): void {
  if (actual !== expected)
    failProtocol("BINDING_MISMATCH", "Simulation binding does not match", path);
}

function assertDigestBinding(actual: string, expected: string, path: string): void {
  if (actual !== expected)
    failProtocol("DIGEST_MISMATCH", "Simulation digest does not match", path);
}

function evaluateScenario(
  scenario: GeneratedScenario,
  trace: RobotBehaviorTrace,
  envelope: ConfidentialEvaluationEnvelope,
  zones: ReadonlyMap<string, WarehouseZone>,
): readonly RuleViolation[] {
  assertTraceInsideWarehouse(trace, envelope);
  const violations: RuleViolation[] = [];
  const failedRules = new Set<RuleId>();
  for (let stepIndex = 0; stepIndex < trace.steps.length; stepIndex += 1) {
    for (const rule of envelope.rules) {
      if (failedRules.has(rule.ruleId)) continue;
      const violation = evaluateRule(rule, scenario, trace, stepIndex, zones);
      if (violation !== null) {
        failedRules.add(rule.ruleId);
        violations.push(violation);
      }
    }
  }
  violations.sort((left, right) => {
    const stepDifference = left.observation.stepIndex - right.observation.stepIndex;
    if (stepDifference !== 0) return stepDifference;
    const rankDifference = RULE_FAMILY_RANK[left.type] - RULE_FAMILY_RANK[right.type];
    if (rankDifference !== 0) return rankDifference;
    if (left.ruleId === right.ruleId) return 0;
    return left.ruleId < right.ruleId ? -1 : 1;
  });
  return Object.freeze(violations);
}

/**
 * Pure deterministic P2 evaluation. It performs no logging and returns full internal evidence.
 *
 * Trust precondition: the caller must authenticate that behaviorTraces came from the declared
 * robot software build. P2 validates the declaration and scenario coverage, but intentionally
 * does not treat arbitrary caller-supplied trace JSON as provenance proof. P3 must enforce that
 * boundary before using this result in a clearance-authoritative workflow.
 */
export function evaluateSimulation(input: unknown): InternalEvaluationReport {
  const raw = expectEvaluationInput(input);
  const request = parseEvaluationRequest(raw.request);
  const robotBuild: RobotBuildDescriptor = parseRobotBuildDescriptor(raw.robotBuild);
  const envelope = parseConfidentialEvaluationEnvelope(raw.confidentialEnvelope);
  const behavior = parseRobotBehaviorTraceSuite(raw.behaviorTraces);
  const evaluatedAt: UnixTimestamp = parseUnixTimestamp(raw.evaluatedAt, "evaluatedAt");

  if (request.inputs.evaluatorVersion !== WAREHOUSE_EVALUATOR_VERSION) {
    return failProtocol(
      "UNSUPPORTED_VERSION",
      "Evaluation request uses an unsupported evaluator version",
      "request.inputs.evaluatorVersion",
    );
  }
  if (
    !(raw.envelopeBlindingSecret instanceof Uint8Array) ||
    raw.envelopeBlindingSecret.length !== 32
  ) {
    return failProtocol(
      "MALFORMED_OBJECT",
      "Evaluation requires a secret 32-byte envelope blind",
      "envelopeBlindingSecret",
    );
  }
  const blind = Uint8Array.from(raw.envelopeBlindingSecret);
  const commitment = digestSafetyEnvelopeCommitment(
    envelope.siteId,
    envelope.safetyEnvelopeId,
    confidentialEnvelopeCommitmentPayload(envelope),
    blind,
  );
  const envelopeMetadata = parseSafetyEnvelopeMetadata({
    schemaVersion: SAFETY_ENVELOPE_METADATA_SCHEMA_VERSION,
    siteId: envelope.siteId,
    safetyEnvelopeId: envelope.safetyEnvelopeId,
    safetyEnvelopeCommitment: commitment,
  });
  assertEvaluationInputBindings(request.inputs, robotBuild, envelopeMetadata);
  assertDigestBinding(
    request.inputs.robotBuildDigest,
    digestRobotBuild(robotBuild),
    "robotBuildDigest",
  );
  assertStringBinding(behavior.robotId, request.inputs.robotId, "behaviorTraces.robotId");
  assertStringBinding(
    behavior.robotBuildId,
    request.inputs.robotBuildId,
    "behaviorTraces.robotBuildId",
  );
  assertDigestBinding(
    behavior.robotBuildDigest,
    request.inputs.robotBuildDigest,
    "behaviorTraces.robotBuildDigest",
  );
  const suite = generateScenarioSuite(envelope.scenarioGeneration);
  if (behavior.traces.length !== suite.scenarios.length) {
    return failProtocol(
      "BINDING_MISMATCH",
      "Behavior traces must exactly cover the generated scenarios",
      "behaviorTraces.traces",
    );
  }
  const tracesByScenario = new Map(behavior.traces.map((trace) => [trace.scenarioId, trace]));
  for (const trace of behavior.traces) {
    if (!suite.scenarios.some((scenario) => scenario.scenarioId === trace.scenarioId)) {
      return failProtocol(
        "BINDING_MISMATCH",
        "Behavior trace references an unknown scenario",
        "behaviorTraces.traces.scenarioId",
      );
    }
    assertTraceInsideWarehouse(trace, envelope);
  }
  const zones = new Map(envelope.zones.map((zone) => [zone.zoneId, zone]));
  const violations: RuleViolation[] = [];
  const scenarioResults: ScenarioEvaluationSummary[] = [];
  for (const scenario of suite.scenarios) {
    const trace = tracesByScenario.get(scenario.scenarioId);
    if (trace === undefined) {
      return failProtocol(
        "BINDING_MISMATCH",
        "Generated scenario is missing a behavior trace",
        "behaviorTraces.traces",
      );
    }
    const scenarioViolations = evaluateScenario(scenario, trace, envelope, zones);
    violations.push(...scenarioViolations);
    scenarioResults.push(
      Object.freeze({
        scenarioId: scenario.scenarioId,
        verdict: scenarioViolations.length === 0 ? "CLEAR" : "HOLD",
        violationCount: scenarioViolations.length,
      }),
    );
  }

  const verdict = violations.length === 0 ? "CLEAR" : "HOLD";
  const result = assertEvaluationResultBindings(
    parseEvaluationResult({
      schemaVersion: EVALUATION_RESULT_SCHEMA_VERSION,
      evaluationId: request.evaluationId,
      inputs: request.inputs,
      evaluationInputsDigest: digestEvaluationInputs(request.inputs),
      verdict,
      evaluatedAt,
    }),
    request,
  );

  return Object.freeze({
    schemaVersion: INTERNAL_EVALUATION_REPORT_VERSION,
    result,
    scenarioCount: suite.scenarios.length,
    violationCount: violations.length,
    scenarioResults: Object.freeze(scenarioResults),
    violations: Object.freeze(violations),
  });
}

export function canonicalizeInternalEvaluationReport(
  report: InternalEvaluationReport,
): CanonicalJson {
  return canonicalSerialize(report);
}
