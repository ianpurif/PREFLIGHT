import {
  assertClearanceSnapshotEligible,
  assertDeploymentIntentSignature,
  buildDeploymentTypedData,
  type ClearanceRegistryReader,
  type ClearanceRegistrySnapshot,
  failRelease,
  hashReleaseSignature,
  ReleaseGateError,
  ROVAULTA_SEPOLIA_DEPLOYMENT,
} from "@rovaulta/chain-client";
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
} from "@rovaulta/domain";
import type { Address, Hex } from "viem";
import type { SqliteReleaseStore } from "./nonce-store.js";
import type { AuthorizedSignerPolicy } from "./signer-policy.js";

const RELEASE_AUTHORIZATION_SCHEMA_VERSION = "rovaulta.release-authorization/v1" as const;
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

export type ReleaseAuthorizationStatus =
  | Readonly<{
      status: "AWAITING_LEDGER";
      protocolIntentDigest: string;
      typedDataDigest: Hex;
    }>
  | Readonly<{
      status: "AUTHORIZED";
      protocolIntentDigest: string;
      typedDataDigest: Hex;
      authorization: ReleaseAuthorization;
    }>;

const RELEASE_AUTHORIZATION_KEYS = Object.freeze([
  "schemaVersion",
  "intent",
  "protocolIntentDigest",
  "typedDataDigest",
  "action",
  "chainId",
  "registry",
  "recoveredSigner",
  "signatureHash",
  "authorizedAt",
  "expiresAt",
  "precheckBlockNumber",
  "precheckBlockHash",
  "postcheckBlockNumber",
  "postcheckBlockHash",
] as const);
const SORTED_RELEASE_AUTHORIZATION_KEYS = Object.freeze([...RELEASE_AUTHORIZATION_KEYS].sort());

function parseStoredAuthorization(
  input: string,
  prepared: PreparedReleaseRequest,
  authorizedSigner: string,
): ReleaseAuthorization {
  try {
    const value: unknown = JSON.parse(input);
    if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error();
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    if (
      keys.length !== RELEASE_AUTHORIZATION_KEYS.length ||
      keys.some((key, index) => key !== SORTED_RELEASE_AUTHORIZATION_KEYS[index])
    ) {
      throw new Error();
    }
    const intent = parseDeploymentIntent(record.intent);
    const authorizedAt = parseUnixTimestamp(record.authorizedAt, "authorizedAt");
    const expiresAt = parseUnixTimestamp(record.expiresAt, "expiresAt");
    if (
      record.schemaVersion !== RELEASE_AUTHORIZATION_SCHEMA_VERSION ||
      canonicalSerialize(intent) !== canonicalSerialize(prepared.intent) ||
      record.protocolIntentDigest !== prepared.protocolIntentDigest ||
      record.typedDataDigest !== prepared.typedDataDigest ||
      record.action !== "ACTIVATE_DEPLOYMENT" ||
      record.chainId !== ROVAULTA_SEPOLIA_DEPLOYMENT.chainId ||
      record.registry !== ROVAULTA_SEPOLIA_DEPLOYMENT.verifyingContract ||
      typeof record.recoveredSigner !== "string" ||
      record.recoveredSigner.toLowerCase() !== authorizedSigner.toLowerCase() ||
      typeof record.signatureHash !== "string" ||
      !/^0x[0-9a-f]{64}$/i.test(record.signatureHash) ||
      expiresAt !== intent.expiresAt ||
      typeof record.precheckBlockNumber !== "string" ||
      !/^[0-9]+$/.test(record.precheckBlockNumber) ||
      record.precheckBlockNumber !== prepared.precheck.blockNumber ||
      typeof record.precheckBlockHash !== "string" ||
      record.precheckBlockHash !== prepared.precheck.blockHash ||
      typeof record.postcheckBlockNumber !== "string" ||
      !/^[0-9]+$/.test(record.postcheckBlockNumber) ||
      BigInt(record.postcheckBlockNumber) < BigInt(record.precheckBlockNumber) ||
      typeof record.postcheckBlockHash !== "string" ||
      !/^0x[0-9a-f]{64}$/i.test(record.postcheckBlockHash)
    ) {
      throw new Error();
    }
    return Object.freeze({
      schemaVersion: RELEASE_AUTHORIZATION_SCHEMA_VERSION,
      intent,
      protocolIntentDigest: prepared.protocolIntentDigest,
      typedDataDigest: prepared.typedDataDigest,
      action: "ACTIVATE_DEPLOYMENT",
      chainId: ROVAULTA_SEPOLIA_DEPLOYMENT.chainId,
      registry: ROVAULTA_SEPOLIA_DEPLOYMENT.verifyingContract,
      recoveredSigner: record.recoveredSigner,
      signatureHash: record.signatureHash,
      authorizedAt,
      expiresAt,
      precheckBlockNumber: record.precheckBlockNumber,
      precheckBlockHash: record.precheckBlockHash,
      postcheckBlockNumber: record.postcheckBlockNumber,
      postcheckBlockHash: record.postcheckBlockHash,
    }) as ReleaseAuthorization;
  } catch {
    return failRelease("PERSISTENCE_UNAVAILABLE", "Stored authorization failed validation");
  }
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
  readonly #nonceFactory: () => ReturnType<typeof parseDeploymentNonce>;

  constructor(options: {
    reader: ClearanceRegistryReader;
    store: SqliteReleaseStore;
    signers: AuthorizedSignerPolicy;
    intentTtlSeconds?: number;
    /**
     * Test/demo-only determinism seam. Production callers omit this and retain the
     * cryptographically random nonce required by the release protocol.
     */
    nonceFactory?: () => ReturnType<typeof parseDeploymentNonce>;
  }) {
    const ttl = options.intentTtlSeconds ?? DEFAULT_INTENT_TTL_SECONDS;
    if (!Number.isSafeInteger(ttl) || ttl < 1 || ttl > 900) {
      failRelease("MALFORMED_REQUEST", "Intent TTL must be an integer from 1 to 900 seconds");
    }
    this.#reader = options.reader;
    this.#store = options.store;
    this.#signers = options.signers;
    this.#intentTtlSeconds = ttl;
    this.#nonceFactory = options.nonceFactory ?? newNonce;
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
      nonce: this.#nonceFactory(),
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
      chainId: ROVAULTA_SEPOLIA_DEPLOYMENT.chainId,
      registry: ROVAULTA_SEPOLIA_DEPLOYMENT.verifyingContract,
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

  getAuthorizationStatus(prepared: PreparedReleaseRequest): ReleaseAuthorizationStatus {
    const intent = parseDeploymentIntent(prepared.intent);
    const stored = this.#store.load(intent.nonce);
    if (
      stored.intentJson !== canonicalSerialize(intent) ||
      stored.protocolIntentDigest !== prepared.protocolIntentDigest ||
      stored.typedDataDigest !== prepared.typedDataDigest ||
      stored.authorizedSigner.toLowerCase() !== prepared.authorizedSigner.toLowerCase()
    ) {
      return failRelease("SIGNATURE_MISMATCH", "Prepared request does not match issued state");
    }
    if (stored.state === "ISSUED") {
      if (stored.authorizationJson !== null) {
        return failRelease(
          "PERSISTENCE_UNAVAILABLE",
          "Issued request contains authorization state",
        );
      }
      return Object.freeze({
        status: "AWAITING_LEDGER",
        protocolIntentDigest: prepared.protocolIntentDigest,
        typedDataDigest: prepared.typedDataDigest,
      });
    }
    if (stored.authorizationJson === null) {
      return failRelease(
        "PERSISTENCE_UNAVAILABLE",
        "Consumed request is missing authorization state",
      );
    }
    return Object.freeze({
      status: "AUTHORIZED",
      protocolIntentDigest: prepared.protocolIntentDigest,
      typedDataDigest: prepared.typedDataDigest,
      authorization: parseStoredAuthorization(
        stored.authorizationJson,
        prepared,
        stored.authorizedSigner,
      ),
    });
  }

  close(): void {
    this.#store.close();
  }
}
