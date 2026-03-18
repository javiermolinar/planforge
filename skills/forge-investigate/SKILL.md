---
name: forge-investigate
description: Read-first discovery skill for understanding code, tracing behavior, finding change points, and recommending next actions.
---

# Investigation

Use this skill when the first job is understanding reality.

## It may

- inspect code, docs, tests, and config
- trace call paths and dependencies
- run commands
- create and run ephemeral scripts
- consult external sources like DeepWiki when useful

## It should output

- what was checked
- what was found
- unknowns or risks
- recommended next step

## Complexity mapping

When relevant, map:

- dependency surface
- hidden control flow
- unclear ownership or boundaries
- unknown unknowns that should become explicit risks, questions, or tests

## Guardrails

- Prefer local repo evidence over external summaries.
- Do not start implementing by default.
- Do not create permanent artifacts unless needed.
