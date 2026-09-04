---
name: preflight-vertical-slice
description: Implement one end-to-end Preflight capability without overbuilding. Use when a task should cross domain, integration, API, contract, and/or UI boundaries as one demonstrable slice.
---

# Vertical Slice

- Start from one acceptance scenario, preferably a demo-visible one.
- Define protocol/domain types at the narrowest shared boundary.
- Keep deterministic evaluation logic separate from rendering and orchestration.
- Put partner-specific code behind adapters and preserve load-bearing behavior.
- Add a failing test first when practical.
- Implement the minimum path to green, then negative/failure tests.
- Do not build adjacent future features.
- End with a runnable proof and update the evidence matrix.
