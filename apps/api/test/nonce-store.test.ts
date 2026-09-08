import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ReleaseGateError } from "@rovaulta/chain-client";
import { SqliteReleaseStore } from "../src/release/index.js";

const row = {
  nonce: "00112233445566778899aabbccddeeff",
  intentJson: "{}",
  clearanceJson: "{}",
  authorizedSigner: "0x0000000000000000000000000000000000000001",
  protocolIntentDigest: `sha256:${"11".repeat(32)}`,
  typedDataDigest: `0x${"22".repeat(32)}`,
  precheckBlockNumber: "11700000",
  precheckBlockHash: `0x${"33".repeat(32)}`,
  precheckBlockTimestamp: "1788548000",
};

describe("durable atomic nonce store", () => {
  test("consumption survives close/reopen and cannot be repeated", () => {
    const directory = mkdtempSync(join(tmpdir(), "rovaulta-p5-"));
    const path = join(directory, "release.sqlite");
    try {
      const first = new SqliteReleaseStore(path);
      first.issue(row);
      first.consume(row.nonce, '{"authorization":true}');
      first.close();

      const reopened = new SqliteReleaseStore(path);
      expect(reopened.load(row.nonce).state).toBe("CONSUMED");
      expect(() => reopened.consume(row.nonce, "{}")).toThrow(ReleaseGateError);
      reopened.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("unknown nonces fail explicitly", () => {
    const store = new SqliteReleaseStore(":memory:");
    expect(() => store.load("missing_nonce_0001")).toThrow(ReleaseGateError);
    store.close();
  });
});
