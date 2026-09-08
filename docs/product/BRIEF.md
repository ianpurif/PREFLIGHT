# Product Brief — Rovaulta

## One-line concept
A confidential deployment gate for autonomous warehouse robots: prove that an exact robot software build passes a factory's private evaluation rules before a human is physically allowed to authorize that exact build for deployment.

## Initial user
Warehouse/factory safety engineer working with a third-party AMR vendor or integrator.

## Core problem
The facility does not want to reveal its complete restricted geometry, safety thresholds, or operating rules. The robot vendor does not want to expose proprietary software/model internals. They still need credible, version-bound evidence that an exact build passed an exact site's evaluation envelope before release.

## MVP story
1. Robot build A is evaluated against hidden site constraints and is denied.
2. Robot build B passes the same confidential envelope.
3. A minimal onchain attestation binds the pass to build/site/evaluator/expiry.
4. Deployment agent prepares a release intent.
5. Safety officer approves that exact intent on Ledger hardware.
6. Simulation begins deployment.
7. Mutating the build digest blocks reuse of the old clearance.

## Explicit non-goals for MVP
- proving a robot is globally or physically safe
- production robotics control loops
- generic AI agent wallet
- payments, tokens, marketplace, insurance, DAO, DEX, lending
- onchain storage of private facility data
- broad multi-robot orchestration

## Success sentence
“This exact robot build passed this exact site's confidential evaluation envelope, and this exact deployment was hardware-authorized by a human.”
