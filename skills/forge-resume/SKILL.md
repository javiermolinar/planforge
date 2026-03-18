---
name: forge-resume
description: Resume deferred work from the shared next queue with assumption re-validation and a fresh continuation plan.
---

# Resume deferred work

Use this when a previous session deferred work and left a follow-up plan in the shared next queue.

## Requirements

- Follow the canonical Planforge philosophy in `../../docs/philosophy.md`.
- Treat the red flags in `../../docs/philosophy.md` as strict warnings, not optional advice.
- Prefer the smallest safe continuation scope.
- Re-validate assumptions before implementation.
- Surface broken windows and decide fix-now vs defer again explicitly.

## Workflow

1. List deferred plans for the current repo:
   - `../../scripts/plan-next-list`
2. Pick the best matching deferred plan with the user.
3. Summarize the deferred item and why it was deferred.
4. Re-check assumptions and mark them: validated / partially validated / unvalidated.
5. Produce a small continuation plan and test table.
6. Initialize or reuse the current branch rolling plan:
   - `../../scripts/plan-init`
7. Continue with implementation and verification flow.

## Output shape

- resume summary
- assumptions re-validation table
- continuation tasks
- test table
- broken windows table
- go/no-go recommendation

## Assumptions re-validation table

| Assumption | Previous status | Current status | Evidence | Risk if wrong | Action |
|---|---|---|---|---|---|

## Broken windows table

| Location | Broken window | Severity | Decision (fix-now/log) | Rationale | Follow-up |
|---|---|---|---|---|---|

If an item is deferred again, create a new follow-up plan path with:

- `../../scripts/plan-next-init <topic>`

and record that path in `Follow-up`.
