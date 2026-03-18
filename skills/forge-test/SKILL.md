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

## Mutation boundaries

`forge-test` may create or modify tests, and only the minimal production code required to make tests meaningful.

- Start with evidence: identify target behavior and expected failure/success signal.
- Keep changes scoped to testability and correctness; avoid unrelated refactors.
- If test work reveals broader implementation scope, stop and request explicit re-approval.

## Output shape

- testing approach
- concrete cases
- commands to run if known
- red/green status for TDD-required scope
- gaps that remain
- suggested handoff (`Next skill: forge-verify`, `Reason: ...`) once testing is complete
