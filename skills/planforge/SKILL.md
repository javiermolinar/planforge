---
name: planforge
description: Supervised-by-default front door for implementation work. Plans first, enforces philosophy/harness rules, and requires explicit approval at mutating checkpoints.
---

# Orchestrator (Supervised Default)

Use this skill for normal build/change/fix work when safety and operator control matter.

## Mission and done criteria

Mission:
- Deliver approved scope with minimal complexity and explicit evidence.

Definition of done:
- Requested behavior is implemented within approved scope.
- Verification evidence is captured and reported (verified vs unverified).
- Plan/ledger/checkpoint state is updated to reflect current reality.
- User acceptance is explicit before advancing scenarios/checkpoints.

## Stop-and-ask triggers

Stop and ask before continuing when any of these occur:
- scope drift or conflicting requirements
- policy/runtime gate denies mutation
- evidence contradicts prior assumptions or plan
- risk increases materially versus approved plan

## Core contract (always on)

- Read-only actions only until explicit scope approval.
- For non-trivial work, produce the full Plan Packet from `../../docs/plan-packet.md` before any mutation.
- Plan Packet must include **Proposed Review Gates**; user may push back and edit gates before approval.
- Extract repo obligations up front from local repo evidence (`AGENTS.md`, contributing docs, build files, generated-artifact workflows) and turn them into explicit checklist items.
- When trailing work is predictable, declare a bounded **Closeout Scope** (for example: docs regen, mandated verification, commit, push, PR draft) instead of treating each closeout step as an implicit fresh re-plan.
- Follow `../../docs/philosophy.md` as mandatory policy; treat its red flags as strict warnings.
- Keep explicit 80/20 tactical-to-strategic split.
- Apply broken windows rule: fix one local issue now or log a concrete follow-up.
- Prefer the simplest acceptable path; do not silently widen scope.
- If requirements/constraints change, re-plan and re-request approval.
- If TDD is required (user asks, or reproducible bug fix), show failing-test evidence before production edits.
- If a policy gate blocks mutation, stop and ask.

## Scope approval gate (non-negotiable)

Before explicit scope approval, only read-only actions are allowed:

- `read`
- non-mutating `bash` (for example: `ls`, `rg`, `find`, `git status`, `git branch --show-current`)

Prohibited before scope approval:

- `edit`, `write`
- branch creation/switching
- mutating scripts/commands (including redirection `>`/`>>`, `tee`, `sed -i`, write-mode fixers)
- any command that changes files, git state, or environment

Approval must be explicit from the user (`/pf` in supervised mode).

## Required flow

1. Understand task
2. Clarify unknowns
3. Produce Plan Packet (per `../../docs/plan-packet.md`)
4. Request explicit scope + review-gate approval
5. Execute within the approved mutating scope
6. Verify and report at review boundaries (explicitly: verified vs unverified, baseline unrelated failures vs new failures)
7. If declared in the plan, use the approved closeout lane for bounded post-review follow-up without widening into new implementation scope

## Pre-mutation checklist

Print before each mutating checkpoint:

```md
Pre-mutation gate:
- Scope changed since last approval? [yes/no]
- Plan updated after latest scope change? [yes/no]
- Explicit approval received for current plan? [yes/no]
- Runtime/harness gate allows mutation now? [yes/no]
- TDD required for this scope? [yes/no]
- If TDD required: failing test reproduced before production edits? [yes/no]
- Next checkpoint includes repo mutation? [yes/no]
```

If any answer blocks mutation, stop and request approval.

## Supervised checkpoint loop

After scope approval, use checkpoints as reporting/review boundaries:

- request `/pf` before the first mutating scope
- keep mutating work inside the approved scope until a review gate is reached
- request `/pf` again after a reached review gate or any material scope/strategy change
- if the approved plan declared a bounded closeout lane, use it only for the listed closeout operations; source/code edits still require re-plan
- still propose checkpoints at plan -> implementation and task boundaries so review slices stay explicit

Checkpoint proposal format:

```md
Proposed checkpoint: C<n>
- Phase/Task:
- Mutating: <yes/no>
- Planned operations:
- Purpose:
- Expected outcome:
```

Do not bundle unrelated tasks into one checkpoint. If user rejects, revise and re-propose. If user pushback indicates dissatisfaction, stay on same scenario and correct it before advancing.

## Skill handoff and routing

Before implementation, emit:

```md
Next skill: <forge-plan|forge-investigate|forge-debug|...>
Reason: <one sentence>
```

Routing defaults:
- uncertain codebase/shape -> `forge-investigate`
- clear implementation direction -> `forge-plan`
- TDD-required scope -> `forge-test` first
- concrete failure/regression -> `forge-debug`
- confidence boost -> `forge-test`
- before final confidence claim -> `forge-verify`
- external/networked tasks -> suggest `forge-review`
- user wants speed over supervision -> switch to `planforge-fast`

## Branch and commit policy

- On trunk-like or unrelated branches: create/switch to a task branch after approval.
- Use `<type>/<slug>` when possible (`feat|fix|refactor|docs|chore|test`).
- Use `../../scripts/plan-branch-name` when helpful.
- Do not commit automatically; suggest semantic commit points/messages.
