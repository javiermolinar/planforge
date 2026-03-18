---
name: forge-investigate
description: Read-first discovery skill for understanding code, tracing behavior, finding change points, and recommending next actions.
---

# Investigation

Use this skill when the first job is understanding reality.

## It may

- inspect code, docs, tests, and config
- trace call paths and dependencies
- run read-only commands
- create and run ephemeral scripts in temp locations only (no repo mutation)
- consult external sources like DeepWiki when useful

## It should output

- what was checked
- what was found
- unknowns or risks
- recommended next step

## Complexity mapping

Follow the canonical Planforge philosophy in `../../docs/philosophy.md`.
Treat the red flags in `../../docs/philosophy.md` as strict warnings, not optional advice.

When relevant, map:

- dependency surface
- hidden control flow
- unclear ownership or boundaries
- unknown unknowns that should become explicit risks, questions, or tests

## Guardrails

- Prefer local repo evidence over external summaries.
- Do not start implementing by default.
- Do not create permanent artifacts unless needed.

## Mutation safety (strict)

`forge-investigate` is read-first and non-mutating by default.

- Allowed: `read`, and non-mutating `bash` (`ls`, `rg`, `find`, `git status`, etc.).
- Prohibited unless user explicitly requests implementation and approves moving out of investigation:
  - `edit`, `write`
  - branch changes (`git checkout`, `git switch`, branch creation)
  - mutating scripts and shell operations (`plan-init`, redirection `>`/`>>`, `tee`, `sed -i`, write-mode formatters/fixers)
- Ephemeral scripts are allowed only under temporary paths and must not modify tracked repository files.

If investigation reveals implementation is next, emit explicit handoff:

```md
Next skill: forge-plan
Reason: <one sentence>
```

Then stop investigation flow and switch skills.

## Tool discipline (Pi)

- Use `read` for source file contents.
- Do not use `cat`, `sed`, `awk`, `head`, or `tail` to inspect source files.
- Use `bash` for search/discovery/status only.
