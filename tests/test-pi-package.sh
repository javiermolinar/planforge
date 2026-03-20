#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

test -f package.json
grep -q '"pi-package"' package.json
grep -q '"./skills"' package.json
grep -q '"./extensions"' package.json

test -f extensions/planforge-approval-gate.ts
test -f extensions/pf-status.ts
grep -q 'registerCommand("pf"' extensions/planforge-approval-gate.ts
grep -q 'registerCommand("pf-status"' extensions/pf-status.ts
grep -q 'PLANFORGE_SUPERVISED_SKILL_CMD' extensions/planforge-approval-gate.ts
grep -q 'PLANFORGE_FAST_SKILL_CMD' extensions/planforge-approval-gate.ts
grep -q 'PLANFORGE_INVESTIGATE_SKILL_CMD' extensions/planforge-approval-gate.ts

test -f skills/planforge/SKILL.md
test -f skills/planforge-fast/SKILL.md
test -f skills/forge-plan/SKILL.md
test -f skills/forge-investigate/SKILL.md

grep -q '../../docs/philosophy.md' skills/planforge/SKILL.md
grep -q '../../docs/philosophy.md' skills/planforge-fast/SKILL.md
grep -q '../../docs/philosophy.md' skills/forge-plan/SKILL.md
grep -q '../../docs/philosophy.md' skills/forge-investigate/SKILL.md
grep -q '../../docs/plan-packet.md' skills/planforge/SKILL.md
grep -q '../../docs/plan-packet.md' skills/planforge-fast/SKILL.md
grep -q '../../docs/plan-packet.md' skills/forge-plan/SKILL.md

test -f docs/philosophy.md
test -f docs/flow.md
test -f docs/modes.md
test -f docs/plan-packet.md
test -f docs/integration-tests.md
grep -q '/skill:planforge' docs/modes.md
grep -q '/skill:planforge-fast' docs/modes.md
grep -q '/skill:forge-investigate' docs/modes.md

test -f AGENTS.md
grep -q 'MODE_CONTRACT:BEGIN' AGENTS.md
grep -q 'MODE_CONTRACT:END' AGENTS.md
test -x tests/test-pi-e2e-modes.sh
test -x tests/test-pi-e2e-pushback.sh

test -f README.md
grep -q '/skill:planforge' README.md
grep -q '/skill:planforge-fast' README.md
grep -Eq '/pf($|[^a-z-])' README.md
grep -q 'docs/philosophy.md' README.md

test -f .github/workflows/ci.yml
grep -q 'test-plan-scripts.sh' .github/workflows/ci.yml
grep -q 'test-pi-package.sh' .github/workflows/ci.yml
grep -q 'test-approval-gate-behavior.sh' .github/workflows/ci.yml

echo 'pi package smoke test: PASS'
