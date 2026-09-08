import { describe, expect, test } from "bun:test";
import { extractPublicResponse } from "../scripts/cre-simulation-evidence.js";

describe("CRE simulation evidence parser", () => {
  test("extracts the public response from CLI logs without retaining the log", () => {
    const response = extractPublicResponse(
      [
        "workflow compiled",
        JSON.stringify({
          execution: {
            status: "EVALUATED",
            schemaVersion: "rovaulta.cre-public-evaluation-result/v1",
            protocolVersion: "rovaulta.protocol/v1",
            result: { evaluationId: "evaluation:corrected-demo", verdict: "CLEAR" },
          },
        }),
      ].join("\n"),
    );
    expect(response.status).toBe("EVALUATED");
  });

  test("accepts the bounded public rejection shape", () => {
    const response = extractPublicResponse(
      JSON.stringify({
        output: {
          status: "REJECT",
          schemaVersion: "rovaulta.cre-public-evaluation-error/v1",
          protocolVersion: "rovaulta.protocol/v1",
          code: "CONFIDENTIAL_EVALUATION_REJECTED",
        },
      }),
    );
    expect(response).toEqual({
      status: "REJECT",
      schemaVersion: "rovaulta.cre-public-evaluation-error/v1",
      protocolVersion: "rovaulta.protocol/v1",
      code: "CONFIDENTIAL_EVALUATION_REJECTED",
    });
  });

  test("fails closed when CLI output contains no public result", () => {
    expect(() => extractPublicResponse("workflow failed without a result")).toThrow(
      "public evaluation result",
    );
  });
});
