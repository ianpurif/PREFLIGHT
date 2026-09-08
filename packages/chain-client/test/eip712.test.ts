import { describe, expect, test } from "bun:test";
import {
  LEGACY_PROTOCOL_VERSION,
  LEGACY_SCHEMA_VERSIONS,
  parseDeploymentIntent,
  parseDeploymentNonce,
  parseUnixTimestamp,
} from "@rovaulta/domain";
import { hashTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  assertDeploymentIntentSignature,
  buildDeploymentTypedData,
  COMPATIBILITY_EIP712_NAME,
  ReleaseGateError,
  type ReleaseGateErrorCode,
  ROVAULTA_DEPLOYMENT_INTENT_TYPES,
  ROVAULTA_SEPOLIA_DEPLOYMENT,
} from "../src/index.js";
import { intentFixture } from "./fixtures.js";

const fixtureAccount = privateKeyToAccount(`0x${"01".repeat(32)}`);

async function expectReleaseCode(
  action: () => Promise<unknown>,
  code: ReleaseGateErrorCode,
): Promise<void> {
  try {
    await action();
    throw new Error(`Expected ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(ReleaseGateError);
    expect((error as ReleaseGateError).code).toBe(code);
  }
}

describe("P5 EIP-712 deployment intent", () => {
  test("uses the exact deployed Sepolia domain and stable field order", () => {
    const request = buildDeploymentTypedData(intentFixture, fixtureAccount.address);
    expect(request.typedData.domain).toEqual({
      name: "Rovaulta",
      version: "1",
      chainId: 11_155_111,
      verifyingContract: "0xFB270cc222efa8B5005AA097dD512Be2558dde65",
    });
    expect(request.typedData.primaryType).toBe("DeploymentIntent");
    expect(ROVAULTA_DEPLOYMENT_INTENT_TYPES.DeploymentIntent.map(({ name }) => name)).toEqual([
      "protocolVersion",
      "schemaVersion",
      "action",
      "siteId",
      "robotId",
      "robotBuildId",
      "robotBuildDigest",
      "clearanceId",
      "clearanceDigest",
      "targetEnvironment",
      "authorizedSigner",
      "nonce",
      "issuedAt",
      "expiresAt",
      "protocolIntentDigest",
    ]);
    expect(request.typedData.message.action).toBe("ACTIVATE_DEPLOYMENT");
    expect(request.typedDataDigest).toBe(
      "0x946fb5f5f6b4996cefbc04a1a989dd2c2a55d12ceb08478e81a42bba1808e865",
    );
  });

  test("keeps legacy wire intents verifiable during the namespace migration", () => {
    const legacyIntent = parseDeploymentIntent({
      ...intentFixture,
      schemaVersion: LEGACY_SCHEMA_VERSIONS.deploymentIntent,
    });
    const request = buildDeploymentTypedData(legacyIntent, fixtureAccount.address);
    expect(request.typedData.domain.name).toBe(COMPATIBILITY_EIP712_NAME);
    expect(request.typedData.message.protocolVersion).toBe(LEGACY_PROTOCOL_VERSION);
    expect(request.typedData.message.schemaVersion).toBe(LEGACY_SCHEMA_VERSIONS.deploymentIntent);
  });

  test("is deterministic and does not retain mutable caller aliases", () => {
    const caller = { ...intentFixture };
    const first = buildDeploymentTypedData(caller, fixtureAccount.address);
    const second = buildDeploymentTypedData({ ...caller }, fixtureAccount.address.toLowerCase());
    expect(first).toEqual(second);
    caller.nonce = parseDeploymentNonce("release_nonce_p5_9999");
    expect(first.typedData.message.nonce).toBe("release_nonce_p5_0001");
    for (let iteration = 0; iteration < 100; iteration += 1) {
      expect(buildDeploymentTypedData({ ...intentFixture }, fixtureAccount.address)).toEqual(first);
    }
  });

  test("every permitted security-field mutation changes the typed-data digest", () => {
    const original = buildDeploymentTypedData(intentFixture, fixtureAccount.address);
    const mutations = [
      { ...intentFixture, siteId: "site:warehouse-b" },
      { ...intentFixture, robotId: "robot:picker-02" },
      { ...intentFixture, robotBuildId: "robot-build:release-002" },
      { ...intentFixture, robotBuildDigest: `sha256:${"33".repeat(32)}` },
      { ...intentFixture, clearanceId: "clearance:p5-release-002" },
      { ...intentFixture, clearanceDigest: `sha256:${"44".repeat(32)}` },
      { ...intentFixture, nonce: "release_nonce_p5_0002" },
      { ...intentFixture, expiresAt: "1788549001" },
    ];
    for (const mutation of mutations) {
      expect(buildDeploymentTypedData(mutation, fixtureAccount.address).typedDataDigest).not.toBe(
        original.typedDataDigest,
      );
    }
    expect(
      buildDeploymentTypedData(intentFixture, privateKeyToAccount(`0x${"02".repeat(32)}`).address)
        .typedDataDigest,
    ).not.toBe(original.typedDataDigest);
  });

  test("domain mutations change the digest and invalidate the original signature", async () => {
    const request = buildDeploymentTypedData(intentFixture, fixtureAccount.address);
    const signature = await fixtureAccount.signTypedData(request.typedData);
    expect(await assertDeploymentIntentSignature(request, signature)).toBe(fixtureAccount.address);

    const alternateDomain = {
      ...request.typedData,
      domain: { ...request.typedData.domain, chainId: 1 },
    };
    expect(hashTypedData(alternateDomain)).not.toBe(request.typedDataDigest);
    const wrongDomainSignature = await fixtureAccount.signTypedData(alternateDomain);
    await expectReleaseCode(
      () => assertDeploymentIntentSignature(request, wrongDomainSignature),
      "SIGNATURE_MISMATCH",
    );

    const anotherRegistry = {
      ...request.typedData,
      domain: {
        ...request.typedData.domain,
        verifyingContract: "0x0000000000000000000000000000000000000001" as const,
      },
    };
    expect(hashTypedData(anotherRegistry)).not.toBe(request.typedDataDigest);
    const wrongRegistrySignature = await fixtureAccount.signTypedData(anotherRegistry);
    await expectReleaseCode(
      () => assertDeploymentIntentSignature(request, wrongRegistrySignature),
      "SIGNATURE_MISMATCH",
    );

    for (const domain of [
      { ...request.typedData.domain, name: "Another application" },
      { ...request.typedData.domain, version: "2" },
    ]) {
      const altered = { ...request.typedData, domain };
      expect(hashTypedData(altered)).not.toBe(request.typedDataDigest);
      const alteredSignature = await fixtureAccount.signTypedData(altered);
      await expectReleaseCode(
        () => assertDeploymentIntentSignature(request, alteredSignature),
        "SIGNATURE_MISMATCH",
      );
    }
  });

  test("rejects unauthorized and malformed signatures", async () => {
    const request = buildDeploymentTypedData(intentFixture, fixtureAccount.address);
    const unauthorized = privateKeyToAccount(`0x${"02".repeat(32)}`);
    const signature = await unauthorized.signTypedData(request.typedData);
    await expectReleaseCode(
      () => assertDeploymentIntentSignature(request, signature),
      "SIGNATURE_MISMATCH",
    );
    await expectReleaseCode(
      () => assertDeploymentIntentSignature(request, "0x1234"),
      "MALFORMED_SIGNATURE",
    );
    expect(() => buildDeploymentTypedData(intentFixture, "not-an-address")).toThrow(
      ReleaseGateError,
    );
    expect(ROVAULTA_SEPOLIA_DEPLOYMENT.chainId).toBe(11_155_111);
  });

  test("signed expiry is immutable and protocol equality remains explicit", () => {
    const request = buildDeploymentTypedData(intentFixture, fixtureAccount.address);
    expect(request.typedData.message.issuedAt).toBe(1_788_547_230n);
    expect(request.typedData.message.expiresAt).toBe(1_788_549_000n);
    expect(
      buildDeploymentTypedData(
        { ...intentFixture, expiresAt: parseUnixTimestamp("1788549001") },
        fixtureAccount.address,
      ).typedDataDigest,
    ).not.toBe(request.typedDataDigest);
  });
});
