---
name: preflight-verification-loop
description: Run the Preflight verification loop before claiming a task is complete or merge-ready. Use after implementation, bug fixes, refactors, partner integrations, or contract changes.
---

# Verification Loop

1. Inspect the diff and identify behavior changed.
2. Run targeted unit tests for the changed surfaces.
3. Run typecheck + lint for affected workspaces.
4. If Solidity changed: `forge fmt --check`, `forge build`, `forge test` and relevant fuzz/invariant tests.
5. If CRE changed: run its Bun tests/typecheck and CRE simulation when available; capture evidence.
6. If Ledger changed: run adapter tests and browser hardware smoke test when device is available; never fake hardware evidence.
7. Run `bun run verify` for merge-ready work.
8. Ask `preflight-verifier` or `preflight-reviewer` to inspect the diff read-only.
9. Resolve findings and record any environment limitation.

Never convert “not run” into “passed.”
