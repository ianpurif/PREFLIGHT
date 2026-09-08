import {
  ClearanceBindingsRecorded,
  ClearanceRecorded,
  ClearanceRevoked,
} from "../generated/RovaultaRegistry/RovaultaRegistry";
import { Clearance } from "../generated/schema";
import { Bytes } from "@graphprotocol/graph-ts";

const ZERO_BYTES32 = Bytes.fromHexString(`0x${"00".repeat(32)}`);

function getOrCreate(digest: Bytes): Clearance {
  let entity = Clearance.load(digest);
  if (entity === null) {
    entity = new Clearance(digest);
    entity.clearanceDigest = digest;
    entity.clearanceIdHash = ZERO_BYTES32;
    entity.evaluationIdHash = ZERO_BYTES32;
    entity.siteIdHash = ZERO_BYTES32;
    entity.robotIdHash = ZERO_BYTES32;
    entity.robotBuildIdHash = ZERO_BYTES32;
    entity.robotBuildDigest = ZERO_BYTES32;
    entity.safetyEnvelopeIdHash = ZERO_BYTES32;
    entity.safetyEnvelopeCommitment = ZERO_BYTES32;
    entity.evaluatorVersionHash = ZERO_BYTES32;
    entity.evaluationInputsDigest = ZERO_BYTES32;
    entity.verdict = ZERO_BYTES32;
    entity.issuer = Bytes.fromHexString("0x0000000000000000000000000000000000000000");
    entity.issuedAt = 0;
    entity.expiresAt = 0;
    entity.revoked = false;
  }
  return entity;
}

export function handleClearanceRecorded(event: ClearanceRecorded): void {
  const entity = getOrCreate(event.params.clearanceDigest);
  entity.clearanceIdHash = event.params.clearanceIdHash;
  entity.robotBuildDigest = event.params.robotBuildDigest;
  entity.verdict = event.params.verdict;
  entity.issuer = event.params.issuer;
  entity.issuedAt = event.params.issuedAt;
  entity.expiresAt = event.params.expiresAt;
  entity.blockNumber = event.block.number;
  entity.blockHash = event.block.hash;
  entity.save();
}

export function handleClearanceBindingsRecorded(event: ClearanceBindingsRecorded): void {
  const entity = getOrCreate(event.params.clearanceDigest);
  entity.siteIdHash = event.params.siteIdHash;
  entity.robotIdHash = event.params.robotIdHash;
  entity.robotBuildIdHash = event.params.robotBuildIdHash;
  entity.safetyEnvelopeIdHash = event.params.safetyEnvelopeIdHash;
  entity.safetyEnvelopeCommitment = event.params.safetyEnvelopeCommitment;
  entity.evaluatorVersionHash = event.params.evaluatorVersionHash;
  entity.evaluationIdHash = event.params.evaluationIdHash;
  entity.evaluationInputsDigest = event.params.evaluationInputsDigest;
  entity.blockNumber = event.block.number;
  entity.blockHash = event.block.hash;
  entity.save();
}

export function handleClearanceRevoked(event: ClearanceRevoked): void {
  const entity = getOrCreate(event.params.clearanceDigest);
  entity.revoked = true;
  entity.blockNumber = event.block.number;
  entity.blockHash = event.block.hash;
  entity.save();
}
