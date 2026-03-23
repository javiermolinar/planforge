# Planforge flow

This is the canonical human-facing workflow document.

For principles, see `docs/philosophy.md`.
For the machine-checkable contract, see `AGENTS.md`.

## Default behavior

Planforge is opinionated:
- always plan before non-trivial implementation
- prefer the simpler path
- challenge overengineering firmly
- stay single-agent by default
- use supervised execution via `/skill:planforge`
- require explicit approval before mutation
- require explicit user acceptance before advancing

## Default workflow

- understand the task
- investigate only as needed
- produce the compact approval-ready Plan Packet from `docs/plan-packet.md`
- propose review gates before first mutation approval
- offer optional extra detail only when helpful or when risk demands expansion
- execute only approved work and keep checkpoints legible
- keep changes scoped and re-plan when scope changes materially
- treat TDD as an implementation tactic, not a planning requirement
- suggest TDD once during planning only when it would materially reduce ambiguity or de-risk a reproducible bug/regression
- report exactly what was run
- distinguish verified vs unverified
- state remaining uncertainty honestly
- require explicit user acceptance before advancing after a review gate

## Approval loop

Use `/pf` to move the supervised workflow forward.

- before the first mutating scope, `/pf` approves mutation
- when a review gate is reached, `/pf` can record acceptance and approve the next scope
- if the user pushes back or scope changes, approval is invalidated and work returns to planning

## Review gates

Review gates are the main supervision boundary.

- propose 1-3 meaningful review gates in the plan
- prefer one final gate for small, low-risk work
- avoid per-command approvals
- keep the gate evidence concrete and testable

## Branch policy

- on `main` / `master` / trunk-like branches, non-trivial implementation should move to a task branch after approval
- the gate should block first implementation edits on trunk until a task branch exists
- use semantic branch names when practical (`feat/`, `fix/`, `refactor/`, `docs/`, `chore/`, `test/`)

## Rolling plans

Each branch has a lightweight rolling plan.

Typical contents:
- current goal
- tasks checklist
- test table
- backlog
- checkpoints
- shipment footer

Planforge uses helper scripts to keep these updates deterministic and cheap. See `docs/tooling.md`.

## Scope rule

If you want a looser or faster flow, prompt directly instead of asking Planforge to behave less like itself.
