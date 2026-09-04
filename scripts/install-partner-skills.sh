#!/usr/bin/env bash
set -euo pipefail

# Project-local partner skills for Codex-compatible agent workflows.
# Run only when you are ready to implement partner integrations.

npx skills add smartcontractkit/chainlink-agent-skills --skill chainlink-cre-skill
npx skills add ledgerhq/agent-skills -s ledger-dmk-implementation dmk-intent-vocabulary dmk-business-logic

echo "Partner skills installed. Review their generated files/diff before committing."
