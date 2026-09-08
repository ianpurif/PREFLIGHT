# ADR-0009: Partner-backed account application boundaries

- Status: Accepted
- Date: 2026-09-08

## Context

The normal account flow must use the three targeted partner boundaries for real work. P3 already
defines the confidential evaluator and P5 defines the final exact-binding Ledger authorization. The
remaining application seams are the transport from an account request to a deployed CRE workflow
and public registry context for the AI deployment agent. A local evaluator or fixture catalog at
either seam would make the partner integration decorative and could present an unverified release
as ready.

The deployed CRE HTTP gateway accepts an execution and returns an execution identifier
asynchronously; it does not synchronously return the confidential handler result. The Graph provider
must expose only public P4 registry fields and cannot become a replacement for the direct P5 read.

## Decision

The API uses `CreHttpEvaluationClient` as the only normal application evaluation executor. It builds
the official JSON-RPC `workflows.execute` body, signs the request with the configured authorized EVM
key, and sends the P1 request, build, supplied behavior, behavior digest, timestamp, and a
site-derived secret selector. The envelope and blinding secret are never serialized into the request.
The client validates a completed public result against the exact request bindings and rejects an
  `ACCEPTED` execution as `CRE_EVALUATION_PENDING`. The application persists the exact pending
  request and completes it only through an optional callback from the TEE: canonical callback JSON
  contains the minimal public result, an HMAC key is fetched inside the TEE, and the API checks the
  exact site/robot/build/evaluation and behavior digest before an idempotent transaction exposes it
  to the account. Missing configuration, gateway errors, malformed output, and network failures fail
  closed. `buildServer` does not install P2 as an implicit fallback; tests must inject the P2 evaluator
  explicitly.

Every account site has a selector of the form
`ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT_<site>`. Operators provision that selector in the CRE `main`
namespace. A request-scoped lookup never falls back to another site's secret; the legacy fixed
selector is simulation compatibility only.

The Graph integration is a server-only Gateway adapter over a from-scratch Sepolia subgraph for the
public `RovaultaRegistry` events. It queries by the exact clearance digest and verifies every P4
binding, `CLEAR` verdict, expiry, revocation state, chain, registry, block number, and block hash.
It returns a redacted public context and never indexes or transmits envelopes, blinds, rules,
thresholds, traces, credentials, or model output.

For authenticated account preparation, the host resolves the exact evaluation/clearance pair from
the account store, then the bounded agent must call `getGraphContext` before `getClearance` and the
existing P5 `ReleaseService.prepare()`. Missing, stale, revoked, expired, mismatched, or unavailable
Graph context blocks before P5. A `MATCHED` Graph result is informational public context only; P5's
direct registry read, signer allowlist, nonce, Ledger device, and post-sign checks remain final.

The static catalog and deterministic local readers are retained only for the explicit development
fixture path and tests. They cannot serve a normal account target.

## Consequences

- The normal product cannot claim a completed evaluation or account-backed Graph preparation while
  external CRE result delivery, site-secret provisioning, Graph hosting/API credentials, or the
  required public clearance is absent.
- A live Graph index can lag or disagree with the registry. The agent blocks on a non-match and P5
  still performs the final direct read, so Graph freshness never weakens authorization.
- The account API can return a truthful pending/unavailable state instead of fabricating a verdict.
  Deploying the callback URL and provisioning the two operator-managed secrets remain external tasks,
  not a local fallback.
- Unit tests use injected provider responses for determinism; they are not live Chainlink or Graph
  qualification evidence.
