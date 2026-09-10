# P7 deterministic demo rehearsal evidence — 2026-09-07

## Evidence classification

- **Offline deterministic rehearsal:** the checked-in P2 evaluator, a scripted P5.2 model, a
  deterministic local registry reader, fixed block timestamp, fixed attempt IDs, and a demo-only
  fixed nonce factory.
- **Not live partner execution:** this artifact is not a Gemini call, positive Sepolia read/write,
  Chainlink CRE run, Ledger signature/consumption, Speculos execution, or robot activation.
- **Public-only output:** no confidential envelope, blind, private rule, threshold, geometry,
  credential, signature, or raw model/request payload is recorded.

## Reproduction

```text
bun install --frozen-lockfile
bun run verify
bun run demo:setup
bun run demo:reset
bun run demo:reset
bun run demo:setup
bun run demo:run
bun run demo:rehearse
```

`demo:reset` removes only the ignored `.data/rovaulta-demo/` directory and is safe to repeat.
The public manifest and last-run trace are generated; no JSON fixture is manually edited.

## Fixed rehearsal identity

- demo clock: `2026-09-07T10:00:00.000Z`
- P2 evaluator: `@rovaulta/simulation-core` deterministic fixture
- registry reader: fixed local snapshot, Sepolia-shaped metadata only
- external calls: Gemini **not used**; Sepolia **not used**; CRE **recorded evidence only**;
  Ledger/Speculos **not used**

## Public scenario results

| Scenario | Exact public build | Evaluator | Agent decision | Ledger state | Build digest |
|---|---|---|---|---|---|
| A unsafe | `robot-build:unsafe-v1` | `HOLD` | `HOLD` / blocked | `NOT_REQUESTED` | `sha256:dfa8a366ab9980769d7e91ea03fa346e2d816c98bd613bc9a6c58bc0d2d39ba8` |
| B corrected | `robot-build:corrected-v1` | `CLEAR` | `LEDGER_APPROVAL_REQUIRED` | `AWAITING_HUMAN` | `sha256:8241d2ea876d4ee5d09df277a0ea6f8f7bcebf96acf47fe9b647ee2aeb9e3999` |
| C mutated | `robot-build:corrected-v2` | corrected baseline; no re-evaluation | `BLOCKED / CLEARANCE_BINDING_MISMATCH` | `NOT_REQUESTED` | `sha256:57006bddb2462247bded3d0e52222651c09828fb6f3e0fae5436601d67c01a0b` |

All three scenarios bind `site:demo-warehouse` and `robot:demo-amr-01`. B's local prepared
clearance is `clearance:demo-corrected`; its exact intent remains at the human Ledger boundary.
C retains that B clearance and cannot reuse it after the deterministic ID/artifact mutation.

Repeated `demo:run` output is byte-for-byte stable. The browser rehearsal additionally proves
that reset clears the session handoff, late prepared responses are ignored, and C never exposes a
Ledger link. The existing P3 authenticated CRE simulation, live Sepolia read-only evidence,
Speculos emulator evidence, and physical Ledger limitations remain separate evidence classes.

On the verification host, the fixed offline setup completed in approximately `0.43s` and a repeat
run in `0.37s`, leaving ample time for a four-minute judge walkthrough; these timings are local
rehearsal measurements, not a claim about live partner latency.
