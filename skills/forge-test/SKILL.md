---
name: forge-test
description: Pragmatic testing skill that prefers test-first work when practical and keeps verification concrete.
---

# Testing and TDD

Use this when code changes need stronger confidence.

## Rules

- Prefer test-first when practical.
- For bugs, prefer a failing reproduction first.
- Expand or refine the test table.
- If strict TDD is not practical, say why and choose the lightest acceptable verification path.
- When TDD is required, produce explicit failing-test evidence (command + failure summary) before any production code edits.
- For write-path changes, build and run a negative test matrix before handoff (downstream failure, partial side effects, lifecycle transitions).
- For new local callbacks/APIs, include lifecycle negatives: `reject-before-ready` and `reject-during-stopping`.
- Keep step-level visibility: for TDD scopes, update a per-step TDD table so each step shows red/green progress.

## Mutation boundaries

`forge-test` may create or modify tests, and only the minimal production code required to make tests meaningful.

- Start with evidence: identify target behavior and expected failure/success signal.
- Keep changes scoped to testability and correctness; avoid unrelated refactors.
- If test work reveals broader implementation scope, stop and request explicit re-approval.

## Completion gate for write paths

For write-path changes, do not hand off as "done" until the negative matrix is exercised (or explicitly marked as blocked with reason and mitigation).

## Output shape

- testing approach
- concrete cases
- commands to run if known
- updated per-step TDD table (for TDD-required scope)
- red/green status for TDD-required scope
- negative test matrix status for write paths (required rows: callback fail, partial side effects, lifecycle transitions)
- lifecycle-safety status for new local callbacks/APIs (`reject-before-ready`, `reject-during-stopping`)
- gaps that remain
- suggested handoff (`Next skill: forge-verify`, `Reason: ...`) once testing is complete
