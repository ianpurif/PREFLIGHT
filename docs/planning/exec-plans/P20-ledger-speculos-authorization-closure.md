# P20 — Ledger/Speculos authorization closure

## Outcome

Close the remaining P5 Ledger evidence gap only if the official DMK + Ethereum
Signer Kit + Speculos path can produce a real Clear Signing signature and the
existing API can verify and persist the corresponding one-time authorization.

## Non-goals

- No physical-device claim or Secure Element claim.
- No backend/private-key signing fallback.
- No changes to Chainlink, The Graph, Gemini, P1–P4, or the release protocol.
- No acceptance of blind signing, legacy typed-data signing, or an unserved local
  descriptor as Clear Signing evidence.

## Invariants

- A Ledger-issued origin token is required before the adapter may request a
  Clear Signing signature.
- The official Context Module must resolve the exact Sepolia registry,
  DeploymentIntent schema, and all display filters.
- The API alone may prepare and consume a request, but only a recovered,
  authorized Ledger signer may produce `AUTHORIZED`.
- The Speculos public test signer and any associated database are test-only.
- Mutated intent/build/clearance bindings and replayed nonces remain rejected.

## Change surfaces

- `packages/ledger-gate`: existing DMK/Speculos transport, context guard, and
  strict typed-data action.
- `apps/web/src/app/p5-ledger`: existing user-gesture approval boundary.
- `apps/api/src/release`: existing prepare/consume/readback authority.
- Local ignored `.env`: test-only Speculos transport and public signer allowlist.
- `docs/partners/LEDGER.md` and compliance evidence: record actual results and
  external prerequisites without exposing tokens.

## Acceptance checks

1. Official Speculos connects and confirms the Ethereum address.
2. With a valid Ledger-issued origin token and served descriptor, an exact
   prepared request reaches `SIGN_TYPED_DATA` and returns a real signature.
3. `/release/consume` recovers the signer, consumes the nonce once, and returns
   `AUTHORIZED`; a second consume and any mutated binding are rejected.
4. Without the token or exact descriptor, the flow remains fail-closed and no
   authorization evidence is claimed.

## Steps
- [x] Explore current adapter, context guard, API readback, and environment.
- [ ] Configure local Speculos-only prerequisites without committing secrets.
- [ ] Run the real signing/readback flow if Ledger prerequisites are available.
- [ ] Add only a minimal fix if a local defect is found.
- [ ] Run targeted Ledger/API tests and the verification loop.
- [ ] Record evidence or the exact external blocker.

## Parallel work / worktrees

No parallel write work. The Ledger trust boundary is kept in this checkout.

## Risks and rollback

The origin token and descriptor acceptance are external Ledger services. Never
replace them with a placeholder, local bypass, or fake signature. Revert only
local test configuration if it is not needed.

## Decisions / deviations

- Current investigation reproduces `CLEAR_SIGNING_UNAVAILABLE` because the
  local origin-token variable is empty.
- Ledger’s current wallet integration documentation states that the token comes
  from the Ledger partner program; the candidate ERC-7730 descriptor is not
  evidence of registry serving by itself.

## Verification evidence

- Official Speculos 0.27.0 + Ethereum 1.22.3 + DMK 1.9.0 address-confirmation
  smoke passed in this environment.
- Exact signing attempt with an empty origin token failed closed with
  `CLEAR_SIGNING_UNAVAILABLE`; no signature or authorization was produced.
