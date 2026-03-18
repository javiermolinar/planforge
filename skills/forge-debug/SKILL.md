---
name: forge-debug
description: Reproduce, isolate, and minimally fix failures before handing back to testing and verification.
---

# Debugging

Use this when behavior is wrong or tests fail unexpectedly.

## Flow

1. Reproduce the issue.
2. Narrow the likely cause.
3. Make the smallest responsible fix.
4. Add or refine tests when practical.
5. Hand back to verification.

## Mutation boundaries

`forge-debug` may include code changes, but only after evidence is established.

- Reproduce and isolate first; do not mutate before a plausible cause is identified.
- Keep changes minimal and scoped to the failure path.
- Avoid branch changes and mutating helper scripts unless explicitly requested by the user/workflow.
- If scope expands beyond the reported failure, stop and request explicit re-approval of expanded scope.

## Tool discipline (Pi)

- Use `read` for source file contents.
- Do not use `cat`, `sed`, `awk`, `head`, or `tail` to inspect source files.
- Use `bash` for discovery/execution/status.

## Guardrails

- Do not guess wildly.
- Prefer evidence over hunches.
- Avoid mixing unrelated cleanup into the fix.

## Handoff checkpoint

When the debug fix and focused tests are complete, explicitly emit:

```md
Next skill: forge-verify
Reason: <one sentence>
```

If additional test authoring is still needed, hand off to `forge-test` first.
