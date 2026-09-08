import { resolve } from "node:path";
import {
  digestSafetyEnvelopeCommitment,
  PROTOCOL_VERSION,
  parseEvaluationInputs,
  parseEvaluationRequest,
  parseUnixTimestamp,
} from "@rovaulta/domain";
import {
  confidentialEnvelopeCommitmentPayload,
  createDeterministicDemoFixture,
  type DemoEvaluationCase,
} from "@rovaulta/simulation-core";
import {
  CRE_CONFIDENTIAL_INPUT_VERSION,
  CRE_PUBLIC_REQUEST_VERSION,
  digestBehaviorInput,
  SYNTHETIC_TRACE_PROVENANCE,
  siteSecretId,
} from "../src/protocol.js";

export interface SimulationFixtureFiles {
  readonly root: string;
  readonly unsafePayloadPath: string;
  readonly correctedPayloadPath: string;
  readonly validEnvironmentPath: string;
  readonly tamperedEnvironmentPath: string;
  readonly secretValue: string;
  readonly siteSecretSelector: string;
}

function bytesToHex(bytes: Uint8Array): string {
  let output = "";
  for (const byte of bytes) output += byte.toString(16).padStart(2, "0");
  return output;
}

function publicInput(demoCase: DemoEvaluationCase) {
  const payload = {
    schemaVersion: CRE_PUBLIC_REQUEST_VERSION,
    protocolVersion: PROTOCOL_VERSION,
    confidentialInputSecretId: siteSecretId(demoCase.request.inputs.siteId),
    request: demoCase.request,
    robotBuild: demoCase.robotBuild,
    behaviorTraces: demoCase.behaviorTraces,
    traceProvenance: SYNTHETIC_TRACE_PROVENANCE,
    evaluatedAt: parseUnixTimestamp(demoCase.evaluatedAt, "evaluatedAt"),
  } as const;
  return { ...payload, behaviorInputDigest: digestBehaviorInput(payload) };
}

function bindRuntimeBlind(demoCase: DemoEvaluationCase, blind: Uint8Array): DemoEvaluationCase {
  const fixture = createDeterministicDemoFixture();
  const safetyEnvelopeCommitment = digestSafetyEnvelopeCommitment(
    fixture.confidentialEnvelope.siteId,
    fixture.confidentialEnvelope.safetyEnvelopeId,
    confidentialEnvelopeCommitmentPayload(fixture.confidentialEnvelope),
    blind,
  );
  const inputs = parseEvaluationInputs({
    ...demoCase.request.inputs,
    safetyEnvelopeCommitment,
  });
  return Object.freeze({
    ...demoCase,
    request: parseEvaluationRequest({ ...demoCase.request, inputs }),
  });
}

function secret(
  blindHex: string,
  fixture: ReturnType<typeof createDeterministicDemoFixture>,
): string {
  return JSON.stringify({
    schemaVersion: CRE_CONFIDENTIAL_INPUT_VERSION,
    protocolVersion: PROTOCOL_VERSION,
    confidentialEnvelope: fixture.confidentialEnvelope,
    envelopeBlindingSecretHex: blindHex,
  });
}

function envFile(value: string): string {
  return `ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT_JSON='${value}'\n`;
}

export async function createSimulationFixtureFiles(
  outputRoot: string,
): Promise<SimulationFixtureFiles> {
  const root = resolve(outputRoot);
  const fixturesRoot = resolve(root, "fixtures");

  const fixture = createDeterministicDemoFixture();
  const validBlindBytes = crypto.getRandomValues(new Uint8Array(32));
  const tamperedBlindBytes = validBlindBytes.slice();
  const firstBlindByte = validBlindBytes.at(0);
  if (firstBlindByte === undefined) throw new Error("failed to generate the simulation blind");
  tamperedBlindBytes[0] = firstBlindByte ^ 0xff;

  const validBlind = bytesToHex(validBlindBytes);
  const tamperedBlind = bytesToHex(tamperedBlindBytes);
  const unsafeFixture = bindRuntimeBlind(fixture.unsafeFixtureBuild, validBlindBytes);
  const correctedFixture = bindRuntimeBlind(fixture.correctedFixtureBuild, validBlindBytes);
  const secretValue = secret(validBlind, fixture);

  const unsafePayloadPath = resolve(fixturesRoot, "unsafe.public.json");
  const correctedPayloadPath = resolve(fixturesRoot, "corrected.public.json");
  const validEnvironmentPath = resolve(root, ".env.cre-valid.local");
  const tamperedEnvironmentPath = resolve(root, ".env.cre-tampered.local");
  await Bun.write(unsafePayloadPath, `${JSON.stringify(publicInput(unsafeFixture), null, 2)}\n`);
  await Bun.write(
    correctedPayloadPath,
    `${JSON.stringify(publicInput(correctedFixture), null, 2)}\n`,
  );
  await Bun.write(validEnvironmentPath, envFile(secretValue));
  await Bun.write(tamperedEnvironmentPath, envFile(secret(tamperedBlind, fixture)));

  return Object.freeze({
    root,
    unsafePayloadPath,
    correctedPayloadPath,
    validEnvironmentPath,
    tamperedEnvironmentPath,
    secretValue,
    siteSecretSelector: siteSecretId(fixture.confidentialEnvelope.siteId),
  });
}
