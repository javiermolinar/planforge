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
- Follow the canonical Planforge philosophy in `../../docs/philosophy.md`.
- Treat the red flags in `../../docs/philosophy.md` as strict warnings, not optional advice.
- Make complexity explicit instead of hand-waving it away.
- Call out dependencies and obscurity before implementation starts.

## Output shape

- plan summary
- assumptions table
- tasks
- test table
- risks / assumptions
- tactical vs strategic split
- complexity check
- dependencies
- obscurity and unknowns
- broken-window check
- broken windows table
- metrics snapshot
- mitigation suggestions (when both complexity and risk are high)

Do not ask for plan approval until the Plan summary and Assumptions table are present.

## Pushback / revision loop

If the user pushes back, changes scope, or asks for plan adjustments after seeing a summary:

- Re-post a revised **Plan summary** before anything else.
- Include an updated **test table** in that same response.
- Make the delta explicit (what changed vs prior summary).
- Then continue with clarifications only after the revised summary is visible.

Never continue toward implementation with a stale summary.

## Plan summary

Provide a concise summary of:

- what will be built
- what will not be built yet
- why this plan shape was chosen

## Assumptions table

When the plan relies on assumptions, include them explicitly in table form:

| Assumption | Category | Evidence | Risk if wrong | Validation plan | Status |
|---|---|---|---|---|---|

Category examples: product, technical, dependency, environment.
Status should be one of: unvalidated, partially validated, validated.

## Tactical vs strategic split

Use an explicit 80/20 tactical-to-strategic split:

- Tactical (~80%): deliver the requested behavior now.
- Strategic (~20%): make targeted improvements that reduce future complexity.

Strategic work must stay local and justified. Avoid turning a focused task into a broad rewrite.

## Complexity check

Assess the proposed change using the philosophy dimensions from `../../docs/philosophy.md`:

- change amplification
- cognitive load
- dependency surface
- obscurity
- unknown unknowns

Use a simple qualitative assessment (low / medium / high) with one sentence of reasoning and one mitigation per dimension.

## Deep-vs-shallow module check

Use the deep-vs-shallow module criteria from `../../docs/philosophy.md`.

Treat shallow module decomposition as a red flag and simplify or merge where practical.

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

## Broken-window check

Before implementation starts, identify obvious local quality debt in the touched area.

For each broken window:
- fix one small, high-leverage item now when cheap and safe, or
- explicitly record it in backlog/checkpoints with a concrete follow-up

Do not ignore visible quality debt silently.

## Broken windows table

When broken windows are found during planning, include them in table form:

| Location | Broken window | Severity | Decision (fix-now/log) | Rationale | Follow-up |
|---|---|---|---|---|---|

If an item is deferred to another session, create a follow-up plan in the shared next queue with:

- `../../scripts/plan-next-init <topic>`

Put the returned path in the `Follow-up` column.

## Metrics snapshot

At the end of the plan, include a compact table:

| Metric | Value | Method | Notes |
|---|---:|---|---|
| Complexity score (0-10) |  | calculated or measured |  |
| Risk score (0-10) |  | calculated |  |

Complexity score (0-10) should be based on the five philosophy dimensions from `../../docs/philosophy.md` (0-2 each):
- change amplification
- cognitive load
- dependency surface
- obscurity
- unknown unknowns

Risk score (0-10) should be based on five operational factors (0-2 each):
- blast radius
- failure impact
- assumption uncertainty
- external/API dependency risk
- verification/test gap

If Complexity >= 7 and Risk >= 7, include mitigation suggestions before asking for approval.

## Mitigation suggestions (required when both are high)

When both metrics are high, propose concrete actions such as:
- split delivery into smaller slices
- reduce interface/dependency surface
- validate critical assumptions first (investigation spike)
- add rollback or containment steps
- require fresh-context `forge-review` before completion
- defer non-essential scope into the shared next queue with `../../scripts/plan-next-init <topic>`

## Red flags

Use the red-flag list in `../../docs/philosophy.md` as canonical.

If you hit one, either:
- redesign the plan now, or
- document the risk and mitigation explicitly before implementation.

## Persistence

When the plan is approved and the target branch is known, persist the rolling plan sections with relative helper scripts such as:

- `../../scripts/plan-set-section CURRENT_GOAL`
- `../../scripts/plan-set-section TASKS`
- `../../scripts/plan-set-section TEST_TABLE`

Use these to keep the saved branch plan aligned with the approved in-chat plan.
