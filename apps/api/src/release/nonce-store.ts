import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { failRelease } from "@rovaulta/chain-client";

export interface StoredReleaseRequest {
  readonly nonce: string;
  readonly intentJson: string;
  readonly clearanceJson: string;
  readonly authorizedSigner: string;
  readonly protocolIntentDigest: string;
  readonly typedDataDigest: string;
  readonly precheckBlockNumber: string;
  readonly precheckBlockHash: string;
  readonly precheckBlockTimestamp: string;
}

interface StoredReleaseRow {
  nonce: string;
  state: "ISSUED" | "CONSUMED";
  intent_json: string;
  clearance_json: string;
  authorized_signer: string;
  protocol_intent_digest: string;
  typed_data_digest: string;
  precheck_block_number: string;
  precheck_block_hash: string;
  precheck_block_timestamp: string;
  authorization_json: string | null;
}

export interface LoadedReleaseRequest extends StoredReleaseRequest {
  readonly state: "ISSUED" | "CONSUMED";
  readonly authorizationJson: string | null;
}

export class SqliteReleaseStore {
  readonly #database!: Database;

  constructor(path: string) {
    try {
      if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
      this.#database = new Database(path, { create: true, strict: true });
      this.#database.run("PRAGMA journal_mode = WAL");
      this.#database.run("PRAGMA synchronous = FULL");
      this.#database.run(`
        CREATE TABLE IF NOT EXISTS release_requests (
          nonce TEXT PRIMARY KEY,
          state TEXT NOT NULL CHECK (state IN ('ISSUED', 'CONSUMED')),
          intent_json TEXT NOT NULL,
          clearance_json TEXT NOT NULL,
          authorized_signer TEXT NOT NULL,
          protocol_intent_digest TEXT NOT NULL,
          typed_data_digest TEXT NOT NULL,
          precheck_block_number TEXT NOT NULL,
          precheck_block_hash TEXT NOT NULL,
          precheck_block_timestamp TEXT NOT NULL,
          authorization_json TEXT
        ) STRICT
      `);
    } catch {
      failRelease("PERSISTENCE_UNAVAILABLE", "Durable release store is unavailable");
    }
  }

  issue(request: StoredReleaseRequest): void {
    try {
      this.#database
        .query(`
          INSERT INTO release_requests (
            nonce, state, intent_json, clearance_json, authorized_signer,
            protocol_intent_digest, typed_data_digest, precheck_block_number,
            precheck_block_hash, precheck_block_timestamp
          ) VALUES (?, 'ISSUED', ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          request.nonce,
          request.intentJson,
          request.clearanceJson,
          request.authorizedSigner,
          request.protocolIntentDigest,
          request.typedDataDigest,
          request.precheckBlockNumber,
          request.precheckBlockHash,
          request.precheckBlockTimestamp,
        );
    } catch {
      failRelease("PERSISTENCE_UNAVAILABLE", "Release nonce could not be persisted");
    }
  }

  load(nonce: string): LoadedReleaseRequest {
    let row: StoredReleaseRow | null;
    try {
      row = this.#database
        .query<StoredReleaseRow, [string]>("SELECT * FROM release_requests WHERE nonce = ?")
        .get(nonce);
    } catch {
      return failRelease("PERSISTENCE_UNAVAILABLE", "Release nonce could not be loaded");
    }
    if (row === null) return failRelease("NONCE_NOT_FOUND", "Release nonce was not issued");
    return Object.freeze({
      nonce: row.nonce,
      state: row.state,
      intentJson: row.intent_json,
      clearanceJson: row.clearance_json,
      authorizedSigner: row.authorized_signer,
      protocolIntentDigest: row.protocol_intent_digest,
      typedDataDigest: row.typed_data_digest,
      precheckBlockNumber: row.precheck_block_number,
      precheckBlockHash: row.precheck_block_hash,
      precheckBlockTimestamp: row.precheck_block_timestamp,
      authorizationJson: row.authorization_json,
    });
  }

  consume(nonce: string, authorizationJson: string): void {
    let changes: number;
    try {
      const result = this.#database
        .query(`
          UPDATE release_requests
          SET state = 'CONSUMED', authorization_json = ?
          WHERE nonce = ? AND state = 'ISSUED'
        `)
        .run(authorizationJson, nonce);
      changes = result.changes;
    } catch {
      failRelease("PERSISTENCE_UNAVAILABLE", "Release nonce could not be consumed");
    }
    if (changes !== 1) failRelease("REPLAY_REJECTED", "Release nonce was already consumed");
  }

  close(): void {
    this.#database.close();
  }
}
