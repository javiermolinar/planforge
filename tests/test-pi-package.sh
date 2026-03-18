#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

test -f package.json

grep -q '"keywords"[[:space:]]*:[[:space:]]*\[[^]]*"pi-package"' package.json
grep -q '"skills"[[:space:]]*:[[:space:]]*\[[^]]*"\./skills"' package.json
grep -q 'pi install /absolute/path/to/planforge -l' README.md
grep -q 'pi install git:github.com/javiermolinar/planforge -l' README.md
grep -q '/skill:planforge' README.md
grep -q '/skill:forge-investigate' README.md
grep -q 'PLANFORGE_HOME' README.md
grep -q 'docs/tooling.md' README.md
grep -q '../../scripts/plan-init' skills/planforge/SKILL.md
grep -q '../../scripts/plan-set-section' skills/forge-plan/SKILL.md
grep -q '../../scripts/plan-append-item' skills/forge-implement/SKILL.md
grep -q 'change amplification' skills/planforge/SKILL.md
grep -q 'cognitive load' skills/planforge/SKILL.md
grep -q 'dependency surface' skills/planforge/SKILL.md
grep -q 'obscurity' skills/planforge/SKILL.md
grep -q 'unknown unknowns' skills/planforge/SKILL.md
grep -q '80/20 tactical-to-strategic split' skills/planforge/SKILL.md
grep -q 'broken window' skills/planforge/SKILL.md
grep -q 'If the first task is understanding the codebase or deciding whether something is bloated, invoke `forge-investigate` first.' skills/planforge/SKILL.md
grep -q 'If the direction is clear and implementation is likely, invoke `forge-plan` next.' skills/planforge/SKILL.md
grep -q 'For external API or networked tasks, auto-suggest a lightweight fresh-context `forge-review` pass before claiming completion.' skills/planforge/SKILL.md
grep -q '## Tactical vs strategic split' skills/forge-plan/SKILL.md
grep -q '80/20 tactical-to-strategic split' skills/forge-plan/SKILL.md
grep -q '## Complexity check' skills/forge-plan/SKILL.md
grep -q 'change amplification' skills/forge-plan/SKILL.md
grep -q 'cognitive load' skills/forge-plan/SKILL.md
grep -q 'dependency surface' skills/forge-plan/SKILL.md
grep -q 'obscurity' skills/forge-plan/SKILL.md
grep -q 'unknown unknowns' skills/forge-plan/SKILL.md
grep -q '## Dependencies' skills/forge-plan/SKILL.md
grep -q '## Obscurity and unknowns' skills/forge-plan/SKILL.md
grep -q '## Broken-window check' skills/forge-plan/SKILL.md
grep -q 'change amplification' skills/forge-review/SKILL.md
grep -q 'cognitive load' skills/forge-review/SKILL.md
grep -q 'dependency surface' skills/forge-review/SKILL.md
grep -q 'obscurity' skills/forge-review/SKILL.md
grep -q 'tactical-to-strategic split' skills/forge-review/SKILL.md
grep -q 'broken window' skills/forge-review/SKILL.md
grep -q 'Prefer a different agent or new session so the review is not contaminated by the implementation context.' skills/forge-review/SKILL.md
grep -q 'Review from a clean packet containing only the task summary, approved plan, changed files or diff, and verification evidence.' skills/forge-review/SKILL.md
grep -q 'hidden control flow' skills/forge-investigate/SKILL.md
grep -q 'unknown unknowns' skills/forge-investigate/SKILL.md
grep -q 'timeout handling' skills/forge-verify/SKILL.md
grep -q 'malformed external payload handling' skills/forge-verify/SKILL.md
grep -q 'automated failure-path test' skills/forge-verify/SKILL.md
grep -q 'Call out remaining complexity risk explicitly' skills/forge-verify/SKILL.md
grep -q 'unresolved complexity risks' skills/forge-verify/SKILL.md
grep -q 'explicit complexity checks' README.md
test -f docs/pi.md
grep -q 'pi config' docs/pi.md
grep -q 'pi install git:github.com/javiermolinar/planforge -l' docs/pi.md
grep -q 'PLANFORGE_HOME' docs/tooling.md
grep -q 'scorecard-init' docs/tooling.md
grep -q '## Design philosophy' docs/flow.md
grep -q 'change amplification' docs/flow.md
grep -q 'cognitive load' docs/flow.md
grep -q 'dependency surface' docs/flow.md
grep -q 'obscurity' docs/flow.md
grep -q 'unknown unknowns' docs/flow.md
grep -q '80/20 tactical-to-strategic split' docs/flow.md
grep -q 'broken-window rule' docs/flow.md
test -x scripts/plan-list
test -x scripts/plan-branch-name
test -x scripts/scorecard-init
test -f benchmarks/results/README.md
grep -q 'optional scorecard output file' benchmarks/results/README.md
test -f benchmarks/backlog.md
grep -q 'save a formal scorecard for this run' benchmarks/backlog.md
grep -q 'turn this benchmark run into a reusable scripted evaluation procedure' benchmarks/backlog.md

echo 'pi package smoke test: PASS'
