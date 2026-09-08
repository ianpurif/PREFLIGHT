import { describe, test } from "bun:test";
import { LEGACY_CONFIDENTIAL_INPUT_ENV_NAME } from "@rovaulta/domain";
import { renderSimulationEnvironmentFile } from "../scripts/simulation-fixtures.js";

describe("CRE simulation fixture secrets", () => {
  test("provides every declared manifest environment mapping without exposing its value", async () => {
    const sentinel = JSON.stringify({
      quote: 'a"b',
      slash: "\\",
      newline: "line-one\nline-two",
    });
    const lines = renderSimulationEnvironmentFile(sentinel).trim().split(/\r?\n/);
    const entries = new Map(
      lines.map((line: string) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)] as const;
      }),
    );
    const currentName = "ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT_JSON";
    const currentValue = entries.get(currentName);
    const compatibilityValue = entries.get(LEGACY_CONFIDENTIAL_INPUT_ENV_NAME);
    if (
      currentValue === undefined ||
      compatibilityValue === undefined ||
      currentValue !== compatibilityValue
    ) {
      throw new Error("simulation env file did not provide matching declared secret mappings");
    }
    try {
      if (JSON.parse(currentValue) !== sentinel) {
        throw new Error("simulation env file changed the confidential value");
      }
    } catch {
      throw new Error("simulation env file did not preserve JSON-safe quoting");
    }
  });
});
