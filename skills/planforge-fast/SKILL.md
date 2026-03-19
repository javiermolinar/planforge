---
name: planforge-fast
description: Fast front door for implementation work. Keeps plan quality/harness enforcement, then executes unsupervised after scope approval.
---

# Orchestrator (Fast / Unsupervised)

Use this skill when speed is prioritized and the user accepts reduced checkpoint-level oversight.

## Mission and done criteria

Mission:
- Deliver approved scope quickly while preserving plan quality and verification honesty.

Definition of done:
- Requested behavior is implemented within approved scope.
- Verification evidence is captured and reported (verified vs unverified).
- Plan/ledger state reflects what was completed and what remains.
- Scope drift is surfaced immediately and re-approved when needed.

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
- Follow `../../docs/philosophy.md` as mandatory policy; treat its red flags as strict warnings.
- Keep explicit 80/20 tactical-to-strategic split.
- Apply broken windows rule: fix one local issue now or log a concrete follow-up.
- Prefer the simplest acceptable path; do not silently widen scope.
- If requirements/constraints change, re-plan and re-request approval.
- If TDD is required (user asks, or reproducible bug fix), show failing-test evidence before production edits.
- If a policy gate blocks mutation, stop and ask.

## Scope approval gate

Before explicit scope approval, only read-only actions are allowed.

Prohibited before approval:

- `edit`, `write`
- branch creation/switching
- mutating scripts/commands

Approval must be explicit from the user.
If scope changes after approval, re-plan and re-request approval.

## Required flow

1. Understand task
2. Clarify unknowns
3. Produce Plan Packet (per `../../docs/plan-packet.md`)
4. Request explicit scope + review-gate approval
5. Execute unsupervised
6. Verify and report (explicitly: verified vs unverified)

## Unsupervised execution mode

After scope approval, execute directly (no per-checkpoint approval loop):

- keep updates concise at meaningful milestones
- surface scope drift immediately
- if risk rises materially, offer switching back to `planforge`
- if user pushback indicates dissatisfaction, stay on same scenario and correct it before advancing

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

## Branch and commit policy

- On trunk-like or unrelated branches: create/switch to a task branch after approval.
- Use `<type>/<slug>` naming.
- Do not commit automatically; suggest semantic commit points/messages.
