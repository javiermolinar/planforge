#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

test -f package.json

grep -q '"keywords"[[:space:]]*:[[:space:]]*\[[^]]*"pi-package"' package.json
grep -q '"skills"[[:space:]]*:[[:space:]]*\[[^]]*"\./skills"' package.json
grep -q '"extensions"[[:space:]]*:[[:space:]]*\[[^]]*"\./extensions"' package.json
test -f extensions/planforge-approval-gate.ts
test -f extensions/pf-status.ts
grep -q 'registerCommand("pf-continue"' extensions/planforge-approval-gate.ts
grep -q 'registerCommand("pf-status"' extensions/pf-status.ts
grep -q 'CONTINUE_APPROVAL' extensions/planforge-approval-gate.ts
grep -q 'PLANFORGE_FAST_SKILL_CMD' extensions/planforge-approval-gate.ts
grep -q 'PLANFORGE_INVESTIGATE_SKILL_CMD' extensions/planforge-approval-gate.ts
grep -q 'approvalConsumed' extensions/planforge-approval-gate.ts
grep -q 'checkpoint-mutation-seen' extensions/planforge-approval-gate.ts
grep -q 'checkpoint-approval-expired' extensions/planforge-approval-gate.ts
grep -q 'SHELL_META_PATTERN' extensions/planforge-approval-gate.ts
grep -q 'Each /pf-continue grants one mutating checkpoint.' extensions/pf-status.ts
grep -q 'Investigation mode detected. Read-only guard is active; mutation requires switching skills.' extensions/planforge-approval-gate.ts
grep -q 'Allowed pre-approval commands: ls, rg, find, git status, git branch --show-current, pwd.' extensions/planforge-approval-gate.ts
grep -q 'pi install /absolute/path/to/planforge' README.md
grep -q 'pi install git:github.com/javiermolinar/planforge' README.md
grep -q '/skill:planforge' README.md
grep -q '/skill:planforge-fast' README.md
grep -q '/pf-continue' README.md
grep -q 'one mutating checkpoint' README.md
grep -q 'Use `/skill:forge-investigate` when the first task is discovery' README.md
grep -q 'checkpoint approvals stay off and a read-only guard blocks mutating tools' README.md
grep -q 'PLANFORGE_HOME' README.md
grep -q 'docs/tooling.md' README.md
grep -q 'docs/releases.md' README.md
test -f docs/releases.md
grep -q 'git tag -a v' docs/releases.md
grep -q 'git push origin v' docs/releases.md
test -f .github/workflows/ci.yml
grep -q 'test-plan-scripts.sh' .github/workflows/ci.yml
grep -q 'test-pi-package.sh' .github/workflows/ci.yml
grep -q 'test-approval-gate-behavior.sh' .github/workflows/ci.yml
test -x tests/test-approval-gate-behavior.sh
test -f .github/workflows/release.yml
grep -q 'tags:' .github/workflows/release.yml
grep -q 'v\*' .github/workflows/release.yml
grep -q 'softprops/action-gh-release' .github/workflows/release.yml
grep -q '../../scripts/plan-init' skills/planforge/SKILL.md
grep -q '../../scripts/plan-set-section' skills/forge-plan/SKILL.md
grep -q '../../scripts/plan-append-item' skills/forge-implement/SKILL.md
grep -q '../../scripts/plan-next-init' skills/forge-plan/SKILL.md
grep -q '../../scripts/plan-next-init' skills/forge-review/SKILL.md
test -f skills/forge-resume/SKILL.md
test -f skills/planforge-fast/SKILL.md
grep -q 'passing architecture/tradeoff quality rubric' skills/planforge-fast/SKILL.md
grep -q 'implementation step ledger' skills/planforge-fast/SKILL.md
grep -q 'per-step TDD table for checkpoint reporting' skills/planforge-fast/SKILL.md
grep -q 'do not advance to the next scenario until satisfaction is explicit' skills/planforge-fast/SKILL.md
grep -q '../../scripts/plan-next-list' skills/forge-resume/SKILL.md
grep -q '../../scripts/plan-init' skills/forge-resume/SKILL.md
grep -q 'Follow the canonical Planforge philosophy in `../../docs/philosophy.md`.' skills/planforge/SKILL.md
grep -q 'Treat the red flags in `../../docs/philosophy.md` as strict warnings, not optional advice.' skills/planforge/SKILL.md
grep -q 'If the first task is understanding the codebase or deciding whether something is bloated, invoke `forge-investigate` first.' skills/planforge/SKILL.md
grep -q 'If the direction is clear and implementation is likely, invoke `forge-plan` next.' skills/planforge/SKILL.md
grep -Eq 'If deferred follow-up plans exist in the next queue, invoke `forge-resume`( to continue them\.)?' skills/planforge/SKILL.md
grep -q 'For external API or networked tasks, auto-suggest a lightweight fresh-context `forge-review` pass before completion.' skills/planforge/SKILL.md
grep -q 'passing architecture/tradeoff quality rubric' skills/planforge/SKILL.md
grep -q 'implementation step ledger' skills/planforge/SKILL.md
grep -q 'per-step TDD table for checkpoint reporting' skills/planforge/SKILL.md
grep -q 'do not advance; revise that same scenario until user confirms satisfaction' skills/planforge/SKILL.md
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
grep -q 'passing Architecture/Tradeoff quality rubric' skills/forge-plan/SKILL.md
grep -q 'Implementation step ledger template before approval' skills/forge-plan/SKILL.md
grep -q '## Complexity check' skills/forge-plan/SKILL.md
grep -q '## Architecture/tradeoff quality rubric (pass/fail)' skills/forge-plan/SKILL.md
grep -q '| Check | Pass/Fail | Evidence |' skills/forge-plan/SKILL.md
grep -q 'Approval gate: do not ask for implementation approval while any rubric row is `Fail` unless the user explicitly accepts the risk.' skills/forge-plan/SKILL.md
grep -q '## Implementation step ledger template (mandatory)' skills/forge-plan/SKILL.md
grep -q '| Step ID | Goal | Planned evidence | User acceptance check | Status | Notes |' skills/forge-plan/SKILL.md
grep -q '## Per-step TDD table template (mandatory when TDD required)' skills/forge-plan/SKILL.md
grep -q '| Step ID | Red test command (expected fail) | Green test command (expected pass) | Refactor guard | User acceptance check | Status |' skills/forge-plan/SKILL.md
grep -q 'Approval gate (TDD scopes): do not ask for implementation approval until this table exists.' skills/forge-plan/SKILL.md
grep -q '## Scenario acceptance gate (mandatory)' skills/forge-plan/SKILL.md
grep -q '## Dependencies' skills/forge-plan/SKILL.md
grep -q '## Obscurity and unknowns' skills/forge-plan/SKILL.md
grep -q '## Broken-window check' skills/forge-plan/SKILL.md
grep -q '## Write-path semantics (mandatory when applicable)' skills/forge-plan/SKILL.md
grep -q '| Side effects order |' skills/forge-plan/SKILL.md
grep -q '| Fail policy (fail-open/fail-closed) |' skills/forge-plan/SKILL.md
grep -q '| Retry implications |' skills/forge-plan/SKILL.md
grep -q '| Idempotency expectations |' skills/forge-plan/SKILL.md
grep -q '## Lifecycle-safety checklist (mandatory for new local callbacks/APIs)' skills/forge-plan/SKILL.md
grep -q 'reject-before-ready' skills/forge-plan/SKILL.md
grep -q 'reject-during-stopping' skills/forge-plan/SKILL.md
grep -q '## Negative test matrix (mandatory for write paths)' skills/forge-plan/SKILL.md
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
grep -q '## Checkpoint reporting contract (mandatory)' skills/forge-implement/SKILL.md
grep -q '| Step ID | Goal | Planned evidence | Actual evidence | User acceptance check | Status | Notes |' skills/forge-implement/SKILL.md
grep -q '| Step ID | Red test command | Red evidence | Green test command | Green evidence | Refactor guard | User acceptance check | Status |' skills/forge-implement/SKILL.md
grep -q 'Do not mark a TDD step `done` unless red and green evidence are both present.' skills/forge-implement/SKILL.md
grep -q '## Scenario acceptance loop (mandatory)' skills/forge-implement/SKILL.md
grep -q 'negative test matrix' skills/forge-test/SKILL.md
grep -q 'updated per-step TDD table (for TDD-required scope)' skills/forge-test/SKILL.md
grep -q 'reject-before-ready' skills/forge-test/SKILL.md
grep -q 'reject-during-stopping' skills/forge-test/SKILL.md
grep -q 'timeout handling' skills/forge-verify/SKILL.md
grep -q 'malformed external payload handling' skills/forge-verify/SKILL.md
grep -q 'automated failure-path test' skills/forge-verify/SKILL.md
grep -q 'negative-matrix verification as a blocking completion criterion' skills/forge-verify/SKILL.md
grep -q 'reject-before-ready' skills/forge-verify/SKILL.md
grep -q 'reject-during-stopping' skills/forge-verify/SKILL.md
grep -q 'Call out remaining complexity risk explicitly' skills/forge-verify/SKILL.md
grep -q 'unresolved complexity risks' skills/forge-verify/SKILL.md
grep -q 'Philosophy source of truth' README.md
test -f docs/pi.md
grep -q 'pi config' docs/pi.md
grep -q 'pi install git:github.com/javiermolinar/planforge' docs/pi.md
grep -q '/skill:planforge-fast' docs/pi.md
grep -q '/pf-continue' docs/pi.md
grep -q 'grants one mutating checkpoint' docs/pi.md
grep -q 'checkpoint approvals stay off and a read-only guard blocks mutating tools' docs/pi.md
grep -q 'PLANFORGE_HOME' docs/tooling.md
grep -q 'scorecard-init' docs/tooling.md
grep -q 'plan-next-init' docs/tooling.md
grep -q 'plan-next-list' docs/tooling.md
grep -q 'plan-ship' docs/tooling.md
grep -q 'plan-ship' docs/pi.md
grep -q '/plans/<repo>/next/' docs/tooling.md
grep -q 'rolling plans only' docs/tooling.md
grep -q '## Design philosophy' docs/flow.md
grep -q 'docs/philosophy.md' docs/flow.md
grep -q 'source of truth' docs/flow.md
grep -q '80/20' docs/flow.md
grep -q 'broken-window rule' docs/flow.md
grep -q 'architecture/tradeoff quality rubric (pass/fail with evidence)' docs/flow.md
grep -q 'implementation step ledger (updated every checkpoint)' docs/flow.md
grep -q 'per-step TDD table when TDD applies' docs/flow.md
grep -q 'scenario acceptance gating (do not advance until user confirms satisfaction)' docs/flow.md
grep -q '## Execution modes' docs/flow.md
grep -q 'planforge-fast' docs/flow.md
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
test -x scripts/plan-ship
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
