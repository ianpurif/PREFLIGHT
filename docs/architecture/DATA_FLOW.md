# Data Flow

This is an architectural contract, not implementation.

1. **Facility configuration** → canonical private envelope + secret 32-byte blind → site/envelope-bound commitment.
2. **Vendor build descriptor** binds robot/build IDs + artifact digest → canonical robot-build digest.
3. **Evaluation request** binds the exact public identifiers, build digest, envelope commitment, evaluator version, and request time. The commitment covers P2 bounds, zones, rules, scenario seed/config/templates, and a secret blind.
4. **Public CRE request** carries the P1 request, exact build descriptor, supplied synthetic traces, explicit evaluation time, a synthetic-provenance marker, and a domain-separated SHA-256 behavior-input digest over those normalized public fields.
5. **Confidential CRE input** is one versioned secret containing the full private envelope and 32-byte blind. It is fetched only by the Nitro `handlerInTee` callback using a compile-time fixed ID; the handler makes no ordinary capability calls.
6. **Deterministic evaluator** runs unchanged inside the confidential callback. It reconstructs the P1 commitment before rule evaluation, validates exact site/envelope/robot/build/evaluator/scenario/trace bindings, and emits the detailed internal report only in TEE-local memory.
7. **Minimal evaluation result** contains the unchanged P1 `EvaluationResult`, public behavior-input digest, and synthetic-provenance marker. Private envelope values, blind, scenario findings, violations, counts, and caught diagnostics do not leave confidential execution. Rejections expose only a fixed schema/status/code.
8. **Registry transaction** is submitted by an owner-authorized registrar after inspecting a valid
   `CLEAR` result. It records the P1 clearance digest and fixed-size exact bindings. The implemented
   P4 path is manual/authorized registration; it is not automatic CRE delivery and is not yet
   deployed to Sepolia.
9. **Web app** reads clearance and constructs a human-readable EIP-712 deployment intent in later phases.
10. **Ledger** displays/signs the exact deployment intent after user action in P5.
11. **Release gate** checks clearance + intent bindings before enabling the simulated deployment.
12. **Digital twin** renders the resulting state.

Canonical schema/digest rules are defined in ADR-0003, deterministic evaluation semantics in
ADR-0004, the confidential/public boundary in ADR-0005, and registry transport/authority semantics
in ADR-0006. No step may silently downgrade to trusting a frontend boolean or an uncommitted
rule/scenario set.

The behavior-input digest protects result-to-request integrity, not origin. An authenticated HTTP submitter can still fabricate well-formed synthetic traces; remote robot/model attestation is outside P3.
