---
name: forge-plan
description: Lightweight planning skill for turning an approved direction into a compact, enforceable implementation plan.
---

# Planning

Use this when direction is clear and implementation is likely.

## Core contract (always on)

- Planning-first: do not edit implementation code while running this skill.
- Follow `../../docs/philosophy.md` as mandatory policy.
- Treat philosophy red flags as strict warnings.
- Use the canonical Plan Packet from `../../docs/plan-packet.md`.
- Prefer the simplest acceptable plan shape; no silent scope widening.
- Keep explicit 80/20 tactical-to-strategic split.
- Apply broken windows rule: fix one local issue now or log concrete follow-up.
- If scope changes, publish revised Plan Summary + updated Test Table before proceeding.
- Planning must propose explicit review gates and invite user pushback before mutation approval.
- If TDD is required (user request or reproducible bug-fix scope), plan starts with failing-test evidence.

## Approval and mutation boundaries

Before explicit approval, only read-only actions are allowed:

- `read`
- non-mutating `bash` (`ls`, `rg`, `find`, `git status`, `git branch --show-current`)

Prohibited before approval:

- `edit`, `write`
- branch changes (`git checkout`, `git switch`, branch creation)
- mutating scripts (`../../scripts/plan-init`, `../../scripts/plan-set-section`, etc.)
- mutating shell ops (`>`, `>>`, `tee`, `sed -i`, write-mode fixers)

## Required flow

1. Understand scope and constraints
2. Clarify unknowns
3. Produce full Plan Packet (see `../../docs/plan-packet.md`)
4. Request approval
5. On pushback, revise same plan and re-request approval

## Approval gates (before asking implementation approval)

Require all applicable sections from `../../docs/plan-packet.md`:

- Always: Plan Summary, File Touch Map, Assumptions, Architecture Justification, Tradeoff Highlights, Rubric, Step Ledger, Test Table, Proposed Review Gates, Red Flags/Broken Windows, Harness Check, Next-skill handoff
- If high-risk scope: High-Risk Execution Checks
- If TDD scope: TDD Test Table + failing-test-first command
- If write-path scope: write-path semantics + lifecycle safety + negative test matrix

Do not request implementation approval while required sections are missing.

## Pushback / revision loop

If user pushes back or scope shifts:

- Re-post revised **Plan Summary** first
- Include updated **Test Table** in same response (and revised **File Touch Map** / **Proposed Review Gates** when changed)
- Make deltas explicit
- Re-request approval

Never continue with stale summary.

## Persistence (after approval only)

When plan is approved and branch context is known, persist sections with:

- `../../scripts/plan-set-section CURRENT_GOAL`
- `../../scripts/plan-set-section TASKS`
- `../../scripts/plan-set-section TEST_TABLE`

Use only after explicit approval.
