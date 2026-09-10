# ADR-0008: Host-owned AI deployment-agent boundary

- Status: Accepted
- Date: 2026-09-07

## Context

Rovaulta needs an autonomous deployment-preparation workflow for the selected Ledger
human-in-the-loop-agent direction. P1–P5 already define the deterministic safety, clearance,
registry, signing, replay, and authorization authorities. Giving a probabilistic model any of those
authorities would break the exact-build invariant and make Ledger decorative.

The P4 registry is intentionally non-enumerable. Reading one clearance therefore requires a trusted
public catalog entry containing the complete P1 clearance record. Model-created identifiers,
digests, clearances, signer addresses, chain IDs, or registry addresses are not acceptable inputs to
security policy.

## Decision

The deployment agent lives in `apps/api`, behind a narrow provider interface. The official Google
Gen AI (`@google/genai`) Gemini adapter supports strict function calling; deterministic scripted
providers are injected only by tests/evidence. Missing production provider configuration fails
without a mock fallback. The adapter sends only an allowlisted canonical public projection.

The host accepts a bounded natural-language deployment form generated from the public catalog (for
example, `Deploy <build> for <robot> to <site>.`). It matches the whole input locally against exact
catalog aliases before calling a provider, then discards the raw text. A second target, free-form
instruction, or non-catalog text is not a valid request. The provider and public audit receive only
the host-generated canonical public request, never the raw submitted string.

The API host owns a bounded state machine and grants the model exactly one next tool at a time:

1. `resolveDeploymentTarget`
2. `getDeploymentContext`
3. `getEvaluationStatus`
4. `getGraphContext` (account-backed production path)
5. `getClearance`
6. `prepareDeploymentIntent`
7. `getLedgerAuthorizationStatus`

Only the first call accepts arguments, and its aliases must resolve to the same entry the host
already resolved from the bounded public form. A strict public catalog locks one immutable
site/robot/build tuple. Later tools use that locked tuple and trusted operator signer context; they
accept no replacement bindings. Unknown, reordered, repeated, malformed, or extra calls fail
closed. There are no generic network, shell, filesystem, registry-write, signing, signature,
consumption, or arbitrary-chain tools.

Evaluation and clearance reads inform the explanation. `ReleaseService.prepare()` remains the only
eligibility/preparation authority and repeats the live exact P4 read while enforcing signer policy
and issuing its server nonce. Successful preparation returns `LEDGER_APPROVAL_REQUIRED`, never
authorization. Ledger signing remains an explicit browser/user action through the existing WebHID
production path or development/test-only Speculos path.

The agent later reports `AUTHORIZED` only by reading the exact prepared nonce after the existing P5
consume path has recovered the Ledger signer, repeated the registry check, and atomically persisted
a valid `ReleaseAuthorization`. Model prose cannot write or override status.

The public audit projection records the host-generated canonical request/target, ordered tool
results, public Graph and clearance context, policy code, intent digests, Ledger-boundary status, and
final status. It omits raw submitted request text, raw model output, signatures, credentials,
private envelopes/blinds, CRE payloads, and private evaluator findings. The Graph context is a
public-input prerequisite for authenticated account targets; it never replaces the direct P5
registry check.

## Consequences

- Ledger is load-bearing: the agent can inspect and prepare but cannot authorize.
- Provider/model variation cannot change the deterministic policy result.
- A public catalog is an operational input and must be curated; ambiguity fails closed.
- The narrow public grammar intentionally rejects conversational free text so it cannot become a
  provider/audit disclosure channel.
- Agent attempt state is currently process-local. P6 may add a durable audit repository without
  changing P5 nonce authority.
- No positive live Sepolia Build B is claimed because no such clearance is currently evidenced.
  Positive agent integration uses a labeled deterministic registry fixture; a live read proves the
  existing unregistered fixture is blocked.
- Physical Ledger, accepted Clear Signing descriptor, and Speculos signing evidence remain separate
  P5 blockers.
