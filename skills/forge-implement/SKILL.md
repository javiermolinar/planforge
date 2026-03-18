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

## TDD gate (strict when required)

If the approved scope requires TDD:

- Do not edit production code until failing-test evidence exists for the target behavior.
- If failing-test evidence is missing, stop and hand off to `forge-test`.
- Keep implementation changes tightly coupled to making the failing test pass.
- After changes, re-run the same test(s) to show red → green progression.

If TDD is not required, state why and proceed with the lightest acceptable verification path.

## Output

- current task
- change made
- verification attempted
- TDD evidence status (red seen? green seen?) when required
- follow-up risks or gaps

## Rolling plan updates

When there is a meaningful checkpoint or a discovered follow-up, suggest updating the saved branch plan with relative helper scripts such as:

- `../../scripts/plan-append-item CHECKPOINTS "..."`
- `../../scripts/plan-append-item BACKLOG "..."`
- `../../scripts/plan-set-section TASKS`

Do not silently update the plan unless the workflow explicitly calls for it.
