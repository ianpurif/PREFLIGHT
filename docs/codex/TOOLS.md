# Tool / MCP Policy

No MCP server is preconfigured in this boilerplate. This is intentional.

The current build needs repository tools, official partner docs/skills, browser tests, and normal web research; a persistent MCP server adds setup and context surface without being load-bearing.

Add an MCP server only when a concrete implementation task repeatedly requires an external capability that cannot be served reliably by the repo/CLI. If added, document why in `docs/planning/DECISIONS.md`, scope permissions narrowly, and never expose private facility inputs or signing secrets.

Playwright is configured as a normal test dependency rather than an MCP because deterministic e2e tests are more useful to the verification gate.
