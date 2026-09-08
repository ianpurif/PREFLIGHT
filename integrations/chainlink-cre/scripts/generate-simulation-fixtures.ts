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
} from "../src/protocol.js";

const fixture = createDeterministicDemoFixture();

function bytesToHex(bytes: Uint8Array): string {
  let output = "";
  for (const byte of bytes) output += byte.toString(16).padStart(2, "0");
  return output;
}

function publicInput(demoCase: DemoEvaluationCase) {
  const payload = {
    schemaVersion: CRE_PUBLIC_REQUEST_VERSION,
    protocolVersion: PROTOCOL_VERSION,
    request: demoCase.request,
    robotBuild: demoCase.robotBuild,
    behaviorTraces: demoCase.behaviorTraces,
    traceProvenance: SYNTHETIC_TRACE_PROVENANCE,
    evaluatedAt: parseUnixTimestamp(demoCase.evaluatedAt, "evaluatedAt"),
  } as const;
  return { ...payload, behaviorInputDigest: digestBehaviorInput(payload) };
}

function bindRuntimeBlind(demoCase: DemoEvaluationCase, blind: Uint8Array): DemoEvaluationCase {
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

function secret(blindHex: string): string {
  return JSON.stringify({
    schemaVersion: CRE_CONFIDENTIAL_INPUT_VERSION,
    protocolVersion: PROTOCOL_VERSION,
    confidentialEnvelope: fixture.confidentialEnvelope,
    envelopeBlindingSecretHex: blindHex,
  });
}

const validBlindBytes = crypto.getRandomValues(new Uint8Array(32));
const tamperedBlindBytes = validBlindBytes.slice();
const firstBlindByte = validBlindBytes.at(0);
if (firstBlindByte === undefined) throw new Error("failed to generate the simulation blind");
tamperedBlindBytes[0] = firstBlindByte ^ 0xff;
const validBlind = bytesToHex(validBlindBytes);
const tamperedBlind = bytesToHex(tamperedBlindBytes);
const unsafeFixture = bindRuntimeBlind(fixture.unsafeFixtureBuild, validBlindBytes);
const correctedFixture = bindRuntimeBlind(fixture.correctedFixtureBuild, validBlindBytes);
const outputs = [
  ["fixtures/unsafe.public.json", `${JSON.stringify(publicInput(unsafeFixture), null, 2)}\n`],
  ["fixtures/corrected.public.json", `${JSON.stringify(publicInput(correctedFixture), null, 2)}\n`],
  [
    ".env.cre-valid.local",
    `ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT_JSON='${secret(validBlind)}'\n`,
  ],
  [
    ".env.cre-tampered.local",
    `ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT_JSON='${secret(tamperedBlind)}'\n`,
  ],
] as const;

for (const [path, contents] of outputs)
  await Bun.write(new URL(`../${path}`, import.meta.url), contents);

console.log("Generated public CRE payloads with a fresh ignored local simulation secret.");
