import {
  assertClearanceSnapshotEligible,
  assertDeploymentIntentSignature,
  buildDeploymentTypedData,
  type ClearanceRegistryReader,
  type ClearanceRegistrySnapshot,
  failRelease,
  hashReleaseSignature,
  PREFLIGHT_SEPOLIA_DEPLOYMENT,
  ReleaseGateError,
} from "@preflight/chain-client";
import {
  type ClearanceRecord,
  canonicalSerialize,
  compareUnixTimestamps,
  createDeploymentIntent,
  type DeploymentIntent,
  parseClearanceRecord,
  parseDeploymentIntent,
  parseDeploymentNonce,
  parseRobotBuildDigest,
  parseRobotBuildId,
  parseRobotId,
  parseSiteId,
  parseUnixTimestamp,
} from "@preflight/domain";
import type { Address, Hex } from "viem";
import type { SqliteReleaseStore } from "./nonce-store.js";
import type { AuthorizedSignerPolicy } from "./signer-policy.js";

const RELEASE_AUTHORIZATION_SCHEMA_VERSION = "preflight.release-authorization/v1" as const;
const DEFAULT_INTENT_TTL_SECONDS = 300;

export interface DeploymentProposal {
  readonly siteId: unknown;
  readonly robotId: unknown;
  readonly robotBuildId: unknown;
  readonly robotBuildDigest: unknown;
  readonly clearance: unknown;
  readonly signerAddress: string;
}

export interface PreparedReleaseRequest {
  readonly intent: DeploymentIntent;
  readonly authorizedSigner: Address;
  readonly protocolIntentDigest: string;
  readonly typedDataDigest: Hex;
  readonly precheck: {
    readonly blockNumber: string;
    readonly blockHash: Hex;
    readonly blockTimestamp: string;
  };
}

export interface ReleaseAuthorization {
  readonly schemaVersion: typeof RELEASE_AUTHORIZATION_SCHEMA_VERSION;
  readonly intent: DeploymentIntent;
  readonly protocolIntentDigest: string;
  readonly typedDataDigest: Hex;
  readonly action: "ACTIVATE_DEPLOYMENT";
  readonly chainId: 11_155_111;
  readonly registry: Address;
  readonly recoveredSigner: Address;
  readonly signatureHash: Hex;
  readonly authorizedAt: string;
  readonly expiresAt: string;
  readonly precheckBlockNumber: string;
  readonly precheckBlockHash: Hex;
  readonly postcheckBlockNumber: string;
  readonly postcheckBlockHash: Hex;
}

export interface ConsumeReleaseRequest {
  readonly intent: unknown;
  readonly signature: unknown;
}

function assertProposalBindings(proposal: DeploymentProposal, clearance: ClearanceRecord): void {
  if (
    parseSiteId(proposal.siteId) !== clearance.inputs.siteId ||
    parseRobotId(proposal.robotId) !== clearance.inputs.robotId ||
    parseRobotBuildId(proposal.robotBuildId) !== clearance.inputs.robotBuildId ||
    parseRobotBuildDigest(proposal.robotBuildDigest) !== clearance.inputs.robotBuildDigest
  ) {
    failRelease("CLEARANCE_BINDING_MISMATCH", "Proposal does not match the exact cleared build");
  }
}

function newNonce(): ReturnType<typeof parseDeploymentNonce> {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return parseDeploymentNonce(
    Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(""),
  );
}

function computeExpiry(
  snapshot: ClearanceRegistrySnapshot,
  clearance: ClearanceRecord,
  ttl: number,
) {
  const now = BigInt(snapshot.blockTimestamp);
  const clearanceExpiry = BigInt(clearance.expiresAt);
  const expiresAt = now + BigInt(ttl) < clearanceExpiry ? now + BigInt(ttl) : clearanceExpiry;
  if (expiresAt <= now)
    return failRelease("CLEARANCE_EXPIRED", "Clearance cannot fund a live intent");
  return parseUnixTimestamp(expiresAt.toString());
}

export class ReleaseService {
  readonly #reader: ClearanceRegistryReader;
  readonly #store: SqliteReleaseStore;
  readonly #signers: AuthorizedSignerPolicy;
  readonly #intentTtlSeconds: number;

  constructor(options: {
    reader: ClearanceRegistryReader;
    store: SqliteReleaseStore;
    signers: AuthorizedSignerPolicy;
    intentTtlSeconds?: number;
  }) {
    const ttl = options.intentTtlSeconds ?? DEFAULT_INTENT_TTL_SECONDS;
    if (!Number.isSafeInteger(ttl) || ttl < 1 || ttl > 900) {
      failRelease("MALFORMED_REQUEST", "Intent TTL must be an integer from 1 to 900 seconds");
    }
    this.#reader = options.reader;
    this.#store = options.store;
    this.#signers = options.signers;
    this.#intentTtlSeconds = ttl;
  }

  async prepare(proposal: DeploymentProposal): Promise<PreparedReleaseRequest> {
    const clearance = parseClearanceRecord(proposal.clearance);
    assertProposalBindings(proposal, clearance);
    const authorizedSigner = this.#signers.assertAuthorized(proposal.signerAddress);
    const snapshot = assertClearanceSnapshotEligible(
      await this.#reader.readExactClearance(clearance),
    );
    const intent = createDeploymentIntent(clearance, {
      targetEnvironment: "sepolia",
      nonce: newNonce(),
      issuedAt: snapshot.blockTimestamp,
      expiresAt: computeExpiry(snapshot, clearance, this.#intentTtlSeconds),
    });
    const prepared = buildDeploymentTypedData(intent, authorizedSigner);
    this.#store.issue({
      nonce: intent.nonce,
      intentJson: canonicalSerialize(intent),
      clearanceJson: canonicalSerialize(clearance),
      authorizedSigner,
      protocolIntentDigest: prepared.protocolIntentDigest,
      typedDataDigest: prepared.typedDataDigest,
      precheckBlockNumber: snapshot.blockNumber.toString(),
      precheckBlockHash: snapshot.blockHash,
      precheckBlockTimestamp: snapshot.blockTimestamp,
    });
    return Object.freeze({
      intent,
      authorizedSigner,
      protocolIntentDigest: prepared.protocolIntentDigest,
      typedDataDigest: prepared.typedDataDigest,
      precheck: Object.freeze({
        blockNumber: snapshot.blockNumber.toString(),
        blockHash: snapshot.blockHash,
        blockTimestamp: snapshot.blockTimestamp,
      }),
    });
  }

  async consume(input: ConsumeReleaseRequest): Promise<ReleaseAuthorization> {
    const suppliedIntent = parseDeploymentIntent(input.intent);
    const stored = this.#store.load(suppliedIntent.nonce);
    if (stored.state !== "ISSUED")
      return failRelease("REPLAY_REJECTED", "Release nonce was consumed");
    if (canonicalSerialize(suppliedIntent) !== stored.intentJson) {
      return failRelease("SIGNATURE_MISMATCH", "Supplied intent does not match the issued request");
    }
    const intent = parseDeploymentIntent(JSON.parse(stored.intentJson));
    const clearance = parseClearanceRecord(JSON.parse(stored.clearanceJson));
    const authorizedSigner = this.#signers.assertAuthorized(stored.authorizedSigner);
    const prepared = buildDeploymentTypedData(intent, authorizedSigner);
    if (
      prepared.protocolIntentDigest !== stored.protocolIntentDigest ||
      prepared.typedDataDigest !== stored.typedDataDigest
    ) {
      return failRelease("SIGNATURE_MISMATCH", "Stored signing request failed reconstruction");
    }
    const recoveredSigner = await assertDeploymentIntentSignature(prepared, input.signature);
    this.#signers.assertAuthorized(recoveredSigner);

    let postcheck: ClearanceRegistrySnapshot;
    try {
      postcheck = assertClearanceSnapshotEligible(await this.#reader.readExactClearance(clearance));
    } catch (error) {
      if (error instanceof ReleaseGateError) {
        return failRelease("CLEARANCE_INVALIDATED", "Clearance became invalid before consumption");
      }
      throw error;
    }
    if (postcheck.blockNumber < BigInt(stored.precheckBlockNumber)) {
      return failRelease("CLEARANCE_INVALIDATED", "Post-sign clearance snapshot moved backwards");
    }
    if (compareUnixTimestamps(postcheck.blockTimestamp, intent.expiresAt) >= 0) {
      return failRelease("INTENT_EXPIRED", "Deployment intent has expired");
    }

    const authorization: ReleaseAuthorization = Object.freeze({
      schemaVersion: RELEASE_AUTHORIZATION_SCHEMA_VERSION,
      intent,
      protocolIntentDigest: prepared.protocolIntentDigest,
      typedDataDigest: prepared.typedDataDigest,
      action: intent.action,
      chainId: PREFLIGHT_SEPOLIA_DEPLOYMENT.chainId,
      registry: PREFLIGHT_SEPOLIA_DEPLOYMENT.verifyingContract,
      recoveredSigner,
      signatureHash: hashReleaseSignature(input.signature),
      authorizedAt: postcheck.blockTimestamp,
      expiresAt: intent.expiresAt,
      precheckBlockNumber: stored.precheckBlockNumber,
      precheckBlockHash: stored.precheckBlockHash as Hex,
      postcheckBlockNumber: postcheck.blockNumber.toString(),
      postcheckBlockHash: postcheck.blockHash,
    });
    this.#store.consume(intent.nonce, canonicalSerialize(authorization));
    return authorization;
  }

  close(): void {
    this.#store.close();
  }
}
