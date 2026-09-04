# Web Scope Instructions

Applies to `apps/web/**`.

- Rendering is never the source of truth for clearance or deployment state.
- Keep WebHID/Ledger code client-only and behind `packages/ledger-gate`.
- Never hard-code a “pass” merely to make the demo animation work.
- A visible signed/approved intent must correspond to the exact payload sent for signing.
- Prefer deterministic demo state and explicit loading/error states over animation complexity.
- Accessibility and a 4-minute judge path matter more than visual ornament.
- Do not add product functionality until the active task requests it.
