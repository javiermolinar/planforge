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
grep -q 'Use `/skill:forge-investigate` when the first task is discovery' README.md
grep -q 'PLANFORGE_HOME' README.md
grep -q 'docs/tooling.md' README.md
grep -q '../../scripts/plan-init' skills/planforge/SKILL.md
grep -q '../../scripts/plan-set-section' skills/forge-plan/SKILL.md
grep -q '../../scripts/plan-append-item' skills/forge-implement/SKILL.md
grep -q '../../scripts/plan-next-init' skills/forge-plan/SKILL.md
grep -q '../../scripts/plan-next-init' skills/forge-review/SKILL.md
test -f skills/forge-resume/SKILL.md
grep -q '../../scripts/plan-next-list' skills/forge-resume/SKILL.md
grep -q '../../scripts/plan-init' skills/forge-resume/SKILL.md
grep -q 'Follow the canonical Planforge philosophy in `../../docs/philosophy.md`.' skills/planforge/SKILL.md
grep -q 'Treat the red flags in `../../docs/philosophy.md` as strict warnings, not optional advice.' skills/planforge/SKILL.md
grep -q 'If the first task is understanding the codebase or deciding whether something is bloated, invoke `forge-investigate` first.' skills/planforge/SKILL.md
grep -q 'If the direction is clear and implementation is likely, invoke `forge-plan` next.' skills/planforge/SKILL.md
grep -q 'If deferred follow-up plans exist in the next queue, invoke `forge-resume` to continue them.' skills/planforge/SKILL.md
grep -q 'For external API or networked tasks, auto-suggest a lightweight fresh-context `forge-review` pass before claiming completion.' skills/planforge/SKILL.md
grep -q 'Follow the canonical Planforge philosophy in `../../docs/philosophy.md`.' skills/forge-plan/SKILL.md
grep -q 'Treat the red flags in `../../docs/philosophy.md` as strict warnings, not optional advice.' skills/forge-plan/SKILL.md
grep -q '## Tactical vs strategic split' skills/forge-plan/SKILL.md
grep -q '80/20 tactical-to-strategic split' skills/forge-plan/SKILL.md
grep -q '## Plan summary' skills/forge-plan/SKILL.md
grep -q '## Assumptions table' skills/forge-plan/SKILL.md
grep -q '| Assumption | Category | Evidence | Risk if wrong | Validation plan | Status |' skills/forge-plan/SKILL.md
grep -q '## Broken windows table' skills/forge-plan/SKILL.md
grep -q '| Location | Broken window | Severity | Decision (fix-now/log) | Rationale | Follow-up |' skills/forge-plan/SKILL.md
grep -q '## Metrics snapshot' skills/forge-plan/SKILL.md
grep -q '| Metric | Value | Method | Notes |' skills/forge-plan/SKILL.md
grep -q 'Complexity score (0-10)' skills/forge-plan/SKILL.md
grep -q 'Risk score (0-10)' skills/forge-plan/SKILL.md
grep -q 'If Complexity >= 7 and Risk >= 7, include mitigation suggestions before asking for approval.' skills/forge-plan/SKILL.md
grep -q '## Mitigation suggestions (required when both are high)' skills/forge-plan/SKILL.md
grep -q 'Do not ask for plan approval until the Plan summary and Assumptions table are present.' skills/forge-plan/SKILL.md
grep -q '## Complexity check' skills/forge-plan/SKILL.md
grep -q '## Dependencies' skills/forge-plan/SKILL.md
grep -q '## Obscurity and unknowns' skills/forge-plan/SKILL.md
grep -q '## Broken-window check' skills/forge-plan/SKILL.md
grep -q 'Follow the canonical Planforge philosophy in `../../docs/philosophy.md`.' skills/forge-review/SKILL.md
grep -q 'Treat the red flags in `../../docs/philosophy.md` as strict warnings, not optional advice.' skills/forge-review/SKILL.md
grep -q 'tactical-to-strategic split' skills/forge-review/SKILL.md
grep -q 'broken window' skills/forge-review/SKILL.md
grep -q '## Review summary' skills/forge-review/SKILL.md
grep -q '## Assumptions challenged table' skills/forge-review/SKILL.md
grep -q '| Assumption | Was it validated? | Evidence | Impact if wrong | Action |' skills/forge-review/SKILL.md
grep -q '## Broken windows found table' skills/forge-review/SKILL.md
grep -q '| Location | Issue | Severity | Immediate fix? | Follow-up |' skills/forge-review/SKILL.md
grep -q '## Metrics snapshot' skills/forge-review/SKILL.md
grep -q '| Metric | Value | Method | Notes |' skills/forge-review/SKILL.md
grep -q 'Complexity score (0-10)' skills/forge-review/SKILL.md
grep -q 'Risk score (0-10)' skills/forge-review/SKILL.md
grep -q 'If Complexity >= 7 and Risk >= 7, include mitigation suggestions before final recommendation.' skills/forge-review/SKILL.md
grep -q '## Mitigation suggestions (required when both are high)' skills/forge-review/SKILL.md
grep -q 'If broken windows are found, mark each as fixed, deferred, or explicitly accepted with rationale.' skills/forge-review/SKILL.md
grep -q 'Prefer a different agent or new session so the review is not contaminated by the implementation context.' skills/forge-review/SKILL.md
grep -q 'Review from a clean packet containing only the task summary, approved plan, changed files or diff, and verification evidence.' skills/forge-review/SKILL.md
grep -q 'Follow the canonical Planforge philosophy in `../../docs/philosophy.md`.' skills/forge-investigate/SKILL.md
grep -q 'Treat the red flags in `../../docs/philosophy.md` as strict warnings, not optional advice.' skills/forge-investigate/SKILL.md
grep -q 'hidden control flow' skills/forge-investigate/SKILL.md
grep -q 'timeout handling' skills/forge-verify/SKILL.md
grep -q 'malformed external payload handling' skills/forge-verify/SKILL.md
grep -q 'automated failure-path test' skills/forge-verify/SKILL.md
grep -q 'Call out remaining complexity risk explicitly' skills/forge-verify/SKILL.md
grep -q 'unresolved complexity risks' skills/forge-verify/SKILL.md
grep -q 'Philosophy source of truth' README.md
test -f docs/pi.md
grep -q 'pi config' docs/pi.md
grep -q 'pi install git:github.com/javiermolinar/planforge -l' docs/pi.md
grep -q 'PLANFORGE_HOME' docs/tooling.md
grep -q 'scorecard-init' docs/tooling.md
grep -q 'plan-next-init' docs/tooling.md
grep -q 'plan-next-list' docs/tooling.md
grep -q '/plans/<repo>/next/' docs/tooling.md
grep -q 'rolling plans only' docs/tooling.md
grep -q '## Design philosophy' docs/flow.md
grep -q 'docs/philosophy.md' docs/flow.md
grep -q 'source of truth' docs/flow.md
grep -q '80/20' docs/flow.md
grep -q 'broken-window rule' docs/flow.md
test -f docs/philosophy.md
grep -q 'deep modules' docs/philosophy.md
grep -q 'shallow module' docs/philosophy.md
grep -q 'Linux file interface' docs/philosophy.md
grep -q '## Red flags' docs/philosophy.md
grep -q '## 6) Keep it simple' docs/philosophy.md
grep -q '## 7) Data first' docs/philosophy.md
grep -q '## 8) Measure before optimize' docs/philosophy.md
grep -q 'premature optimization' docs/philosophy.md
grep -q 'docs/philosophy.md' README.md
test -x scripts/plan-list
test -x scripts/plan-branch-name
test -x scripts/scorecard-init
test -x scripts/plan-next-init
test -x scripts/plan-next-list
test -f benchmarks/results/README.md
grep -q 'optional scorecard output file' benchmarks/results/README.md
test -f benchmarks/results/2026-03-18-api-cli-go.md
test -f benchmarks/results/2026-03-18-api-cli-rust.md
grep -q 'Benchmark scoreboard' README.md
grep -q 'benchmarks/results/2026-03-18-api-cli-go.md' README.md
grep -q 'benchmarks/results/2026-03-18-api-cli-rust.md' README.md
test -f benchmarks/backlog.md
grep -q 'save a formal scorecard for this run' benchmarks/backlog.md
grep -q 'turn this benchmark run into a reusable scripted evaluation procedure' benchmarks/backlog.md

echo 'pi package smoke test: PASS'
