import type { DeploymentAgentToolDefinition, DeploymentAgentToolName } from "./types.js";

const EMPTY_PARAMETERS = Object.freeze({
  type: "object",
  properties: Object.freeze({}),
  required: Object.freeze([]),
  additionalProperties: false,
});

const DESCRIPTIONS: Record<DeploymentAgentToolName, string> = {
  resolveDeploymentTarget:
    "Extract the requested public site, robot, and build references. The host resolves canonical identifiers.",
  getDeploymentContext:
    "Read the locked canonical public target and fixed Sepolia registry context.",
  getEvaluationStatus: "Read the public deterministic evaluation verdict for the locked target.",
  getClearance: "Inspect the candidate public clearance against the fixed Sepolia registry.",
  prepareDeploymentIntent:
    "Ask the existing deterministic P5 release service to prepare the exact locked target.",
  getLedgerAuthorizationStatus:
    "Read whether the exact prepared P5 nonce still awaits Ledger or has a verified authorization.",
};

export function toolDefinition(name: DeploymentAgentToolName): DeploymentAgentToolDefinition {
  return Object.freeze({
    name,
    description: DESCRIPTIONS[name],
    parameters:
      name === "resolveDeploymentTarget"
        ? Object.freeze({
            type: "object",
            properties: Object.freeze({
              siteRef: Object.freeze({ type: "string" }),
              robotRef: Object.freeze({ type: "string" }),
              buildRef: Object.freeze({ type: "string" }),
            }),
            required: Object.freeze(["siteRef", "robotRef", "buildRef"]),
            additionalProperties: false,
          })
        : EMPTY_PARAMETERS,
  });
}

export function parseToolArguments(
  expected: DeploymentAgentToolName,
  actualName: string,
  input: unknown,
): Record<string, unknown> {
  if (
    actualName !== expected ||
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new Error("Agent tool call violated the protocol");
  }
  const record = input as Record<string, unknown>;
  const allowed = expected === "resolveDeploymentTarget" ? ["siteRef", "robotRef", "buildRef"] : [];
  if (
    Object.keys(record).some((key) => !allowed.includes(key)) ||
    allowed.some((key) => !Object.hasOwn(record, key))
  ) {
    throw new Error("Agent tool arguments violated the protocol");
  }
  return record;
}
