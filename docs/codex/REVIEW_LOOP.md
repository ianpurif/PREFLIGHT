# Review Loop

1. Main agent runs targeted + full verification.
2. Reviewer receives only task acceptance criteria, relevant AGENTS instructions, and diff.
3. Reviewer reports prioritized findings with evidence.
4. Main agent reproduces material findings.
5. Fix and rerun narrow tests.
6. Rerun full gate if behavior changed.
7. Partner auditor checks Chainlink/Ledger changes separately.

A review is not a substitute for commands actually passing.
