---
name: forge-plan
description: Lightweight planning skill for turning an approved direction into a short implementation plan and test table.
---

# Planning

Use this after the direction is clear and implementation is likely.

## Requirements

- Keep the plan short and actionable.
- Split work into small checklist tasks.
- Include assumptions and constraints when they matter.
- Include a compact test table.
- Challenge unnecessary abstraction or scope.

## Output shape

- goal
- tasks
- test table
- risks / assumptions

## Persistence

When the plan is approved and the target branch is known, persist the rolling plan sections with relative helper scripts such as:

- `../../scripts/plan-set-section CURRENT_GOAL`
- `../../scripts/plan-set-section TASKS`
- `../../scripts/plan-set-section TEST_TABLE`

Use these to keep the saved branch plan aligned with the approved in-chat plan.
