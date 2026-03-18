#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

test -f package.json

grep -q '"keywords"[[:space:]]*:[[:space:]]*\[[^]]*"pi-package"' package.json
grep -q '"skills"[[:space:]]*:[[:space:]]*\[[^]]*"\./skills"' package.json
grep -q 'pi install /absolute/path/to/planforge' README.md
grep -q 'pi install git:github.com/' README.md
grep -q '/skill:orchestrator' README.md
grep -q '/skill:investigation' README.md
grep -q '../../scripts/plan-init' skills/orchestrator/SKILL.md
grep -q '../../scripts/plan-set-section' skills/planning/SKILL.md
grep -q '../../scripts/plan-append-item' skills/implementation/SKILL.md
grep -q 'If the first task is understanding the codebase or deciding whether something is bloated, invoke `investigation` first.' skills/orchestrator/SKILL.md
grep -q 'If the direction is clear and implementation is likely, invoke `planning` next.' skills/orchestrator/SKILL.md
grep -q 'Infer a semantic branch type automatically when it is obvious: `feat`, `fix`, `refactor`, `docs`, `chore`, or `test`.' skills/orchestrator/SKILL.md
grep -q 'If the branch type is ambiguous, ask instead of guessing.' skills/orchestrator/SKILL.md
grep -q 'Suggest semantic commit messages such as `feat: ...` or `fix: ...`.' skills/orchestrator/SKILL.md
grep -q 'After successful verification, suggest a semantic commit message and whether the branch should likely be squashed later.' skills/orchestrator/SKILL.md
grep -q 'For external API or networked tasks, auto-suggest a lightweight fresh-context `review` pass before claiming completion.' skills/orchestrator/SKILL.md
grep -q 'Prefer a different agent or new session so the review is not contaminated by the implementation context.' skills/review/SKILL.md
grep -q 'Review from a clean packet containing only the task summary, approved plan, changed files or diff, and verification evidence.' skills/review/SKILL.md
grep -q 'timeout handling' skills/verification/SKILL.md
grep -q 'malformed external payload handling' skills/verification/SKILL.md
grep -q 'automated failure-path test' skills/verification/SKILL.md
grep -q 'feat/<slug>' README.md
grep -q 'fix/<slug>' README.md
grep -q 'feat: ' README.md
grep -q 'refactor/<slug>' docs/flow.md
grep -q 'plan-branch-name' README.md
grep -q 'scorecard-init' README.md
test -f docs/pi.md
grep -q 'pi config' docs/pi.md
grep -q 'pi install git:github.com/' docs/pi.md
grep -q 'Semantic branch and commit conventions also apply on Pi' docs/pi.md
grep -q 'scorecard-init' docs/pi.md
test -x scripts/plan-list
test -x scripts/plan-branch-name
test -x scripts/scorecard-init
test -f benchmarks/results/README.md
grep -q 'optional scorecard output file' benchmarks/results/README.md
test -f benchmarks/backlog.md
grep -q 'save a formal scorecard for this run' benchmarks/backlog.md
grep -q 'turn this benchmark run into a reusable scripted evaluation procedure' benchmarks/backlog.md

echo 'pi package smoke test: PASS'
