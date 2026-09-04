# Chainlink CRE Scope Instructions

Applies to `integrations/chainlink-cre/**`.

- Read `docs/partners/CHAINLINK.md` before edits.
- CRE TypeScript runs in WASM/QuickJS: no Node built-ins, browser globals, filesystem assumptions, or arbitrary npm packages without compatibility verification.
- The final confidential path must use `handlerInTee` and process real sensitive product data.
- Keep private site-envelope values and confidential intermediates inside the TEE path.
- Emit only minimum public result fields needed for clearance.
- Add Bun tests with SDK mocks and run a real CRE simulation before claiming completion.
- Boilerplate phase must not implement fake pass/fail logic.
