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
- Make complexity explicit instead of hand-waving it away.
- Call out dependencies and obscurity before implementation starts.

## Output shape

- goal
- tasks
- test table
- risks / assumptions
- complexity check
- dependencies
- obscurity and unknowns

## Complexity check

Assess the proposed change using these dimensions:

- change amplification — how many places need to change when the behavior changes later?
- cognitive load — how much does a reader need to hold in their head to understand this?
- dependency surface — what internal or external systems does this depend on?
- obscurity — what behavior, ownership, or failure mode is hard to see quickly?
- unknown unknowns — what are we likely underestimating or not understanding yet?

Use a simple qualitative assessment such as low / medium / high with one sentence of reasoning and one mitigation.

## Dependencies

Call out:

- internal dependencies
- external dependencies
- any new dependency introduced by the plan
- why each dependency is justified

## Obscurity and unknowns

Call out:

- hidden behavior to make explicit
- assumptions to validate
- likely failure modes
- anything that should move from unknown unknowns into explicit checks or tests

## Persistence

When the plan is approved and the target branch is known, persist the rolling plan sections with relative helper scripts such as:

- `../../scripts/plan-set-section CURRENT_GOAL`
- `../../scripts/plan-set-section TASKS`
- `../../scripts/plan-set-section TEST_TABLE`

Use these to keep the saved branch plan aligned with the approved in-chat plan.
