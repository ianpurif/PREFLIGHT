# Chainlink CRE Scaffold

This package is isolated because CRE TypeScript compiles to a constrained WASM/QuickJS runtime.

The implementation phase must use the current official CRE SDK and create a real confidential handler. Do not put a fake `handlerInTee` wrapper around logic that already leaked the private envelope in the API layer.

Expected future flow:

`public request -> confidential TEE handler -> private envelope/evaluation -> minimal result -> public report/registry`

No workflow logic is implemented yet.
