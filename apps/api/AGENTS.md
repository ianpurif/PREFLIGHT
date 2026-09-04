# API Scope Instructions

Applies to `apps/api/**`.

- API orchestrates; it is not the safety authority.
- Never accept a frontend `isCleared=true` as proof.
- Never hold the Ledger deployment private key.
- Do not log private envelope values or TEE-only material.
- Validate all external identifiers at boundaries once schemas exist.
- Prefer Fastify injection tests over starting real ports for unit/integration tests.
- Keep `/health` trivial; product routes require explicit implementation tasks.
