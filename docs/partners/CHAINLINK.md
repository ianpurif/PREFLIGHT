# Chainlink CRE Integration Contract

## Prize target
**Best Confidential Workflow** (From Scratch).

## Must become true in implementation
- Build a CRE Workflow using Confidential Workflows.
- The core evaluation uses a TEE handler (`handlerInTee` in TypeScript).
- At least one genuinely sensitive input/private parameter/confidential response/intermediate value is processed inside the confidential handler.
- Confidential execution is load-bearing to Preflight; a placeholder enclave call does not qualify.
- Successful simulation or live deployment is demonstrated with logs/CLI/deployment evidence.

## Preflight-specific load-bearing role
The facility's private safety envelope is the sensitive input. The public result must reveal the minimum useful clearance artifact, not the envelope.

## Engineering constraints
- Keep CRE code in `integrations/chainlink-cre`.
- The TypeScript CRE environment compiles to WASM/QuickJS; do not assume Node built-ins or browser globals.
- Keep a CRE-specific `tsconfig.json` with `types: []`, `ESNext`, Bundler resolution, strict/noEmit.
- Never route private envelope values through ordinary app logs just to reach the TEE.

## Evidence to capture later
- CRE source and exact confidential handler lines
- simulation command + successful output
- screenshot/terminal capture for demo
- sample public result showing no private inputs
- architecture diagram highlighting confidential boundary

## Official resources
- https://docs.chain.link/cre
- https://github.com/smartcontractkit/cre-sdk-typescript
- https://github.com/smartcontractkit/chainlink-agent-skills
