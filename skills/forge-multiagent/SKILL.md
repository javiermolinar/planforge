---
name: forge-multiagent
description: Optional escalation skill for parallelizable work or independent review.
---

# Multiagent

Use this only when the work splits cleanly into independent chunks or an independent review loop is worth the coordination cost.

## Rules

- Do not use by default.
- Only split work with minimal shared state.
- Keep sub-tasks explicit and bounded.
- Recombine results carefully.
