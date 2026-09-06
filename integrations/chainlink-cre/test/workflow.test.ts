import { expect, test } from "bun:test";
import type { TeeRuntime } from "@chainlink/cre-sdk";
import { test as creTest, newTestRuntime, type Secrets } from "@chainlink/cre-sdk/test";
import { evaluateInTee, type WorkflowConfig } from "../src/confidential-evaluation.js";
import { CONFIDENTIAL_INPUT_SECRET_ID } from "../src/protocol.js";
import { initWorkflow } from "../src/workflow.js";
import { encodePublicInput, fixture, makeConfidentialSecret, makePublicInput } from "./helpers.js";

test("workflow registers one official HTTP handler with explicit Nitro TEE requirements", () => {
  const authorizedEvmAddress = `0x${"12".repeat(20)}`;
  const workflow = initWorkflow({ authorizedEvmAddress });
  expect(workflow).toHaveLength(1);
  const handler = workflow[0];
  expect(handler?.trigger.capabilityId()).toBe("http-trigger@1.0.0-alpha");
  expect(JSON.parse(JSON.stringify(handler?.trigger))).toMatchObject({
    config: {
      authorizedKeys: [{ type: 1, publicKey: authorizedEvmAddress }],
    },
  });
  expect(JSON.parse(JSON.stringify(handler?.requirements))).toMatchObject({
    tee: {
      item: {
        case: "teeTypesAndRegions",
        value: {
          teeTypeAndRegions: [{ type: 1, regions: ["us-west-2"] }],
        },
      },
    },
  });
  expect(handler?.fn).toBe(evaluateInTee);
  expect(handler?.hooks).toBeUndefined();
});

creTest("SDK test runtime supplies the confidential value to the TEE callback", () => {
  const secrets: Secrets = new Map([
    ["main", new Map([[CONFIDENTIAL_INPUT_SECRET_ID, makeConfidentialSecret()]])],
  ]);
  const runtime = newTestRuntime<WorkflowConfig>(secrets, undefined, {
    authorizedEvmAddress: `0x${"12".repeat(20)}`,
  });
  const response = evaluateInTee(runtime as unknown as TeeRuntime<WorkflowConfig>, {
    input: encodePublicInput(makePublicInput(fixture.correctedFixtureBuild)),
  });
  expect(response.status).toBe("EVALUATED");
  if (response.status !== "EVALUATED") throw new Error("expected evaluated result");
  expect(response.result.verdict).toBe("CLEAR");
  expect(runtime.getLogs()).toEqual([]);
});
