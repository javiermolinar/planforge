---
name: forge-implement
description: Execute the approved plan task by task while keeping scope tight and surfacing drift.
---

# Implementation

Use this after planning is approved and branch context is ready.

## Rules

- Implement against the approved plan.
- Work task by task.
- Keep changes scoped.
- Avoid unrelated refactors unless clearly justified.
- Surface scope drift instead of silently absorbing it.
- Suggest rolling-plan updates at meaningful checkpoints.
- Report step-level progress on every checkpoint so the user can see exactly what was completed.

## Execution mode inheritance

- Inherit execution mode from orchestrator:
  - `planforge` → supervised implementation loop
  - `planforge-fast` → unsupervised implementation loop
- Do not silently downgrade from supervised to unsupervised.
- If mode is unclear, ask before proceeding.

## Supervised implementation loop (when required)

When running under supervised mode, approve work by implementation task/checkpoint (not per command):

1. Propose one implementation checkpoint with an id.
2. Wait for explicit approval (`/pf-continue`).
3. Execute the bounded commands needed to complete that checkpoint.
4. Report result with an updated implementation step ledger (and per-step TDD table when required), ask for user acceptance of the completed scenario, and only then propose the next checkpoint.

Checkpoint proposal format:

```md
Proposed checkpoint: I<n>
- Task: <task id/title>
- Mutating: <yes/no>
- Planned operations: <short list of expected edits/commands>
- Purpose: <why now>
- Expected outcome: <what is complete when checkpoint ends>
```

Rules:

- Do not request `/pf-continue` for purely read-only steps.
- Do not bundle unrelated tasks into one checkpoint approval.
- If task scope changes materially, issue a new id and re-request approval before further mutation.

## TDD gate (strict when required)

If the approved scope requires TDD:

- Do not edit production code until failing-test evidence exists for the target behavior.
- If failing-test evidence is missing, stop and hand off to `forge-test`.
- Keep implementation changes tightly coupled to making the failing test pass.
- After changes, re-run the same test(s) to show red → green progression.

If TDD is not required, state why and proceed with the lightest acceptable verification path.

For write-path changes, implementation must preserve and report semantics from the approved plan:

- side effects order
- fail-open/fail-closed policy
- retry implications
- idempotency expectations

## Checkpoint reporting contract (mandatory)

After each implementation checkpoint, include an updated ledger:

| Step ID | Goal | Planned evidence | Actual evidence | User acceptance check | Status | Notes |
|---|---|---|---|---|---|---|

Use statuses: `pending`, `in_progress`, `awaiting_user_acceptance`, `done`, `revise_requested`, `blocked`.

When TDD is required, also include an updated per-step TDD table:

| Step ID | Red test command | Red evidence | Green test command | Green evidence | Refactor guard | User acceptance check | Status |
|---|---|---|---|---|---|---|---|

Use statuses: `pending`, `red_seen`, `green_seen`, `awaiting_user_acceptance`, `done`, `revise_requested`, `blocked`.

Do not mark a TDD step `done` unless red and green evidence are both present.

## Scenario acceptance loop (mandatory)

After each scenario/checkpoint result:

1. Mark the current step `awaiting_user_acceptance`.
2. Ask the user whether the scenario is acceptable.
3. If the user pushes back, mark `revise_requested`, propose a correction checkpoint for the same step, and do not advance.
4. Only after user acceptance, mark `done` and propose the next scenario.

Do not move to the next scenario while the current one is `awaiting_user_acceptance` or `revise_requested`.

## Scope drift and re-approval

- If implementation discovers material scope drift (new behavior, extra modules, or changed acceptance criteria), stop and request re-approval before continuing.
- In supervised mode, drift handling returns to proposal state; do not execute additional mutating actions until re-approved.

## Output

- current task
- execution mode (`supervised` or `unsupervised`)
- change made
- verification attempted
- updated implementation step ledger
- updated per-step TDD table (when required)
- scenario acceptance status (accepted / awaiting feedback / revise requested)
- TDD evidence status (red seen? green seen?) when required
- approval status for current checkpoint (when supervised)
- follow-up risks or gaps

## Rolling plan updates

When there is a meaningful checkpoint or a discovered follow-up, suggest updating the saved branch plan with relative helper scripts such as:

- `../../scripts/plan-append-item CHECKPOINTS "..."`
- `../../scripts/plan-append-item BACKLOG "..."`
- `../../scripts/plan-set-section TASKS`

Do not silently update the plan unless the workflow explicitly calls for it.
