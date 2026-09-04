# Simulation Scope Instructions

Applies to `packages/simulation-core/**`.

- Simulation truth must be deterministic under an explicit seed/config.
- Rendering never feeds back into verdict logic.
- No network calls inside deterministic rule evaluation.
- Prefer pure functions and property/golden tests for safety-envelope logic.
- A simulated pass is not physical-safety proof; preserve that wording in names/docs.
- No real evaluator logic belongs in the boilerplate phase.
