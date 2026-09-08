# ADR-0003: Rovaulta Canonical Protocol v1

**Status:** Accepted for P1

## Decision

The shared protocol lives in `@rovaulta/domain` and uses exact versioned schemas, separately branded identifiers/digests, Rovaulta Canonical JSON v1, and SHA-256 with versioned domain separation.

## Identifier format

Every protocol identifier is a lowercase ASCII string with a required type prefix and a 1–64 character token. Tokens may contain lowercase letters, digits, `.`, `_`, and `-`, and must begin and end with a letter or digit.

| Type | Prefix |
|---|---|
| Site | `site:` |
| Robot | `robot:` |
| Robot software build | `robot-build:` |
| Safety envelope | `safety-envelope:` |
| Evaluator version | `evaluator-version:` |
| Evaluation | `evaluation:` |
| Clearance | `clearance:` |

Prefixes are validated at runtime and types are separately branded at compile time. Parsers do not trim, case-fold, or otherwise normalize identifiers.

## Schema version strategy

- Global protocol version: `rovaulta.protocol/v1`.
- Every wire object has an exact schema literal such as `rovaulta.evaluation-request/v1`.
- Parsers reject unknown fields and unsupported versions instead of silently dropping data.
- A schema change that alters canonical meaning requires a new schema literal and, when digest framing changes, a new digest domain/version.

## Rovaulta Canonical JSON v1

Canonical input is limited to:

- `null`, booleans, NFC-normalized well-formed Unicode strings, and safe integers other than negative zero
- dense arrays, preserving element order
- plain data objects with enumerable string data-properties only

Object keys are sorted using ECMAScript UTF-16 code-unit ordering. JSON string escaping is used with no insignificant whitespace, then the result is encoded as UTF-8. Canonicalization rejects fractions, unsafe integers, non-finite numbers, `undefined`, bigint, functions, symbols, sparse/custom arrays, symbol/hidden/accessor properties, custom prototypes, typed objects, cycles, lone surrogates, and non-NFC strings. Values are capped at 64 levels and 10,000 nodes so failures remain explicit rather than becoming runtime stack/resource failures.

This is a Rovaulta-specific format; it is not claimed to implement RFC 8785.

## Digest strategy

Each digest is:

```text
sha256(UTF8(canonicalize({ domain, protocolVersion, payload })))
```

The domains are separately versioned for robot builds, safety-envelope commitments, evaluation inputs, clearances, and deployment intents. Results use lowercase `sha256:<64 hex>` encoding and distinct TypeScript brands. Golden vectors lock the exact byte semantics.

`@noble/hashes` provides synchronous, pure TypeScript SHA-256 without a Node-only API. Actual Chainlink QuickJS/CRE compilation remains P3 evidence; P1 tests do not claim it.

## Confidential safety-envelope commitment

The public commitment binds:

- schema version
- exact site ID
- exact safety-envelope ID
- canonical confidential payload
- a secret 32-byte blinding value

The confidential payload and blind are never returned or included in errors. A plain hash of low-entropy private rules is intentionally not exposed because it would permit offline guessing. Generation and custody of the blind inside the confidential execution path remain P3 work.

## Time and expiry

Protocol times are canonical decimal Unix-second strings, with no sign, fraction, or leading zero. Parsers do not read the wall clock. Clearance and deployment expiry must be strictly later than issuance; contextual checks ensure an intent cannot outlive its clearance.

## Binding semantics

Evaluation inputs bind the exact site, robot, robot-build ID and digest, safety-envelope ID and commitment, and evaluator version. Results repeat those inputs and their digest. A clearance is only representable for verdict `CLEAR` and binds the exact evaluation, inputs, digest, issuance, and expiry.

A deployment intent repeats the exact site/robot/build/clearance bindings, includes the clearance digest, Sepolia target, nonce, issuance, and expiry. P1 validates those bindings but does not authorize deployment.

## Deferred by design

- deterministic safety evaluation: P2
- confidential payload/blind generation and CRE handling: P3
- onchain validity, revocation, and wall-clock expiry: P4
- EIP-712 mapping, chain/verifying-contract domain, signer authorization, nonce consumption, and hardware signing: P5
