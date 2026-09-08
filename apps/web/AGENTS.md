# Web Scope Instructions

Applies to `apps/web/**`.

- Rendering is never the source of truth for clearance or deployment state.
- Keep WebHID/Ledger code client-only and behind `packages/ledger-gate`.
- Never hard-code a “pass” merely to make the demo animation work.
- A visible signed/approved intent must correspond to the exact payload sent for signing.
- Normal `/app` routes must render authenticated API state; deterministic demo state belongs only to
  explicit development/test fixture routes. Keep loading/error states explicit over animation
  complexity.
- Accessibility and a 4-minute judge path matter more than visual ornament.
- Do not add product functionality until the active task requests it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
