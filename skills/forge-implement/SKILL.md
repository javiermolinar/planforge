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

## Execution mode inheritance

- Inherit execution mode from orchestrator:
  - `planforge` → supervised implementation loop
  - `planforge-yolo` → unsupervised implementation loop
- Do not silently downgrade from supervised to unsupervised.
- If mode is unclear, ask before proceeding.

## Supervised implementation loop (when required)

When running under supervised mode:

1. Propose exactly one action with an id.
2. Wait for explicit approval (`/continue`).
3. Execute only that approved action.
4. Report result and propose the next single action.

Proposal format:

```md
Proposed action: I<n>
- Tool: <read|bash|edit|write|...>
- Command/Args: <exact command or concise args summary>
- Mutating: <yes/no>
- Purpose: <why now>
- Expected outcome: <what changes/what we learn>
```

Rules:

- Do not batch multiple tool calls under one approval.
- If command/args change materially, issue a new id and re-request approval.

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

## Scope drift and re-approval

- If implementation discovers material scope drift (new behavior, extra modules, or changed acceptance criteria), stop and request re-approval before continuing.
- In supervised mode, drift handling returns to proposal state; do not execute additional mutating actions until re-approved.

## Output

- current task
- execution mode (`supervised` or `unsupervised`)
- change made
- verification attempted
- TDD evidence status (red seen? green seen?) when required
- approval status for last action (when supervised)
- follow-up risks or gaps

## Rolling plan updates

When there is a meaningful checkpoint or a discovered follow-up, suggest updating the saved branch plan with relative helper scripts such as:

- `../../scripts/plan-append-item CHECKPOINTS "..."`
- `../../scripts/plan-append-item BACKLOG "..."`
- `../../scripts/plan-set-section TASKS`

Do not silently update the plan unless the workflow explicitly calls for it.
