---
name: planforge
description: Opinionated front door for delivery work. Plan first, then execute with explicit approval gates.
---

# Planforge

Use this skill when you want the harness to stay opinionated and supervised.

## Core contract

- Read-only actions only until explicit scope approval.
- Follow `../../docs/philosophy.md` as mandatory policy.
- For non-trivial work, produce the Plan Packet from `../../docs/plan-packet.md` before mutation.
- Plans must include `## Proposed Review Gates` before first mutation approval.
- Keep scope explicit, prefer the simplest acceptable path, and stop on material drift.
- Verification and user acceptance must be explicit before advancing.

## Planning default

- Start with the compact approval-ready packet from `../../docs/plan-packet.md`.
- Offer optional numbered follow-up detail when it would help, but do not make extra detail a prerequisite for approval.
- If the work is materially risky, ambiguous, or crosses tricky boundaries, expand the packet before asking for approval.

## Implementation guidance

- Execute only approved work with supervised checkpoints.
- Keep changes tight and re-plan on material drift.
- TDD is an implementation tactic, not a planning artifact.
- Suggest TDD once at the end of planning only when it would materially reduce ambiguity or de-risk a reproducible bug/regression.
- Do not turn TDD into a gate prompt and do not repeat it at every review gate.
- If the user requests TDD, or the bug/regression is best pinned down with a failing test first, show that failing-test evidence before production edits.

## Verification guidance

- Report verified vs unverified.
- State remaining uncertainty honestly.
- Do not advance while user acceptance is unresolved.

## Checkpoint loop

- request `/pf` before the first mutating scope
- keep work inside the approved checkpoint until a review gate or scope change
- request `/pf` again after a reached review gate or material scope change
- do not advance while user acceptance is still unresolved
