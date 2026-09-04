# Ledger Gate Scope Instructions

Applies to `packages/ledger-gate/**`.

- Browser-only hardware boundary. Do not import this package into server runtime code.
- Use current Ledger DMK + WebHID + Ethereum Signer Kit; do not add legacy `@ledgerhq/hw-*` packages.
- Connect/discover from explicit user interaction.
- Final deployment approval must be a hardware-backed signature over an exact, human-readable deployment intent.
- No automatic signing, blind generic messages, or server fallback in the real judged path.
- Mock adapters are allowed only in tests and must be visibly distinct from hardware evidence.
