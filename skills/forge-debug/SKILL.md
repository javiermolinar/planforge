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

## Guardrails

- Do not guess wildly.
- Prefer evidence over hunches.
- Avoid mixing unrelated cleanup into the fix.
