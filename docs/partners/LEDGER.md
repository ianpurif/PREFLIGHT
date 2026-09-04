# Ledger Integration Contract

## Prize target
**AI Agents x Ledger** (From Scratch).

## Must become true in implementation
- Device-backed security is central to release authorization.
- Use Ledger Device Management Kit (DMK) and current Ethereum Signer Kit, not deprecated LedgerJS `hw-*` packages.
- A human physically approves the high-risk deployment action.
- The release signature binds the same exact build/site/clearance identifiers checked by the release gate.
- The real judged path cannot silently fall back to a backend/private-key signer.

## Preflight-specific load-bearing role
The agent/orchestrator may prepare a deployment. It cannot release the robot build. Ledger is the physical human authorization boundary.

## Browser constraints
- WebHID belongs in a client-only module.
- Device discovery must be initiated from a user gesture where required.
- Use localhost/HTTPS during browser testing.
- Keep the DMK instance lifecycle controlled and avoid duplicate initialization.

## Intended signing primitive
EIP-712 typed data through `@ledgerhq/device-signer-kit-ethereum`, subject to implementation verification against current Ledger docs.

## Evidence to capture later
- physical device signing demo
- typed intent visible/understandable to human
- build-mismatch attempt blocked
- source lines proving DMK/Signer Kit usage
- no backend release key

## Official resources
- https://developers.ledger.com/docs/device-interaction/dmk-ts/
- https://www.npmjs.com/package/@ledgerhq/device-management-kit
- https://www.npmjs.com/package/@ledgerhq/device-signer-kit-ethereum
- https://github.com/LedgerHQ/agent-skills
