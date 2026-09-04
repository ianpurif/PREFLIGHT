# Contract Scope Instructions

Applies to `contracts/**`.

- Keep the onchain surface minimal. No raw private facility data.
- Authorization must fail closed on build/site/version/expiry mismatch.
- Prefer typed custom errors and events over ambiguous booleans when implementation starts.
- Contract state/authorization changes require Foundry unit + fuzz/invariant coverage.
- Never make the contract claim physical safety; it records/verifies scoped clearance evidence.
- Use Sepolia in the hackathon path unless explicitly changed.
