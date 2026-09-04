# Quality Gates

## Every change
- nearest `AGENTS.md` followed
- focused tests pass
- no secrets introduced
- lint/typecheck pass for changed workspaces

## Cross-layer feature
- written acceptance scenario
- failure-path test
- full `bun run verify`
- independent read-only review
- `CURRENT.md` + task state updated

## Chainlink feature
- CRE-specific typecheck/test
- confidential boundary reviewed
- real CRE simulation/deployment command captured
- output reviewed for over-disclosure

## Ledger feature
- adapter tests
- Chromium WebHID smoke test
- real device evidence when hardware is available
- signed payload matches displayed payload
- no server-key fallback in judged path

## Contract feature
- `forge fmt --check`
- `forge build`
- `forge test`
- fuzz/invariant tests appropriate to authorization logic

## Demo-ready
- Playwright happy-path smoke
- deterministic reset
- build-mutation denial visible
- 4-minute acceptance contract passes
