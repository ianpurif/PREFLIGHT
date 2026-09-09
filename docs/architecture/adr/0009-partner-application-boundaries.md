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

The Graph integration is a server-only provider adapter over a from-scratch Sepolia subgraph for the
public `RovaultaRegistry` events. It queries by the exact clearance digest and verifies every P4
binding, `CLEAR` verdict, expiry, revocation state, chain, registry, block number, and block hash.
The production path is The Graph Gateway; an exact hosted Subgraph Studio query URL is also allowed
when a deployment has not been published to Gateway, and its evidence is labelled separately. It
returns a redacted public context and never indexes or transmits envelopes, blinds, rules, thresholds,
traces, credentials, or model output.

The subgraph package pins the Graph CLI and AssemblyScript runtime and provides separate codegen,
build, deploy, query, and account-agent evidence commands. Deployment and live evidence are
operator actions; the normal repository build never contacts a provider. Gateway credentials,
hosted subgraph IDs, and the optional Studio URL are server-only environment values.

For authenticated account preparation, the host resolves the exact evaluation/clearance pair from
the account store, then the bounded agent must call `getGraphContext` before `getClearance` and the
existing P5 `ReleaseService.prepare()`. Missing, stale, revoked, expired, mismatched, or unavailable
Graph context blocks before P5. A `MATCHED` Graph result is informational public context only; P5's
direct registry read, signer allowlist, nonce, Ledger device, and post-sign checks remain final.

The static catalog and deterministic local readers are retained only for the explicit development
fixture path and tests. They cannot serve a normal account target.

The normal application also exposes an explicit operator-selected
`ROVAULTA_CRE_EXECUTION_MODE=simulation` mode. It invokes the unchanged official CRE CLI workflow
for account-owned inputs, creates a temporary workflow `secretsNames` mapping for the exact site
selector, and persists `official-cre-cli-simulation` plus the CLI version only after the same public
callback and exact-binding checks pass. Gateway mode remains the default; simulation mode is
provenance for a local official CLI execution, not a live CRE/DON assertion or a P2 fallback.

## Consequences

- The normal product cannot claim a completed evaluation or account-backed Graph preparation while
  external CRE result delivery, site-secret provisioning, Graph hosting/API credentials, or the
  required public clearance is absent.
- A live Graph index can lag or disagree with the registry. The agent blocks on a non-match and P5
  still performs the final direct read, so Graph freshness never weakens authorization.
- The account API can return a truthful pending/unavailable state instead of fabricating a verdict.
  Deploying the callback URL and provisioning the two operator-managed secrets remain external tasks,
  not a local fallback.
- P13's site-secret handoff is a separate local operator command. It resolves the encrypted policy
  through the application store and gives the official CRE CLI an in-memory versioned payload; it
  is never an HTTP route and never writes the envelope or blind to evidence.
- Unit tests use injected provider responses for determinism; they are not live Chainlink or Graph
  qualification evidence.
- Account-owned simulation tests use a fake process runner for deterministic cleanup and parser
  coverage; they are not evidence of a real operator account, Sepolia transaction, or Graph index.
