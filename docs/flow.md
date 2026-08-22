# Forge flow

This is the canonical human-facing workflow for the Forge skill.

For shared policy, see `docs/philosophy.md` and `docs/core.md`.

## 1. Investigate

Forge starts with a cheap, read-only investigation. It discovers applicable repository instructions, current behavior, likely change surfaces, relevant tests, and verification obligations.

It does not ask permission to inspect and does not ask the user for facts available in the repository.

The initial pass avoids dependency installation, network access, full builds, full test suites, and commands expected to change the working tree.

## 2. Clarify

Forge asks only material decisions that cannot be resolved from repository evidence.

Questions follow the current dependency-free frontier:

- each round contains independent decisions
- every question includes a recommended answer
- later rounds are recomputed from earlier answers
- reversible implementation details receive disclosed defaults

If the frontier remains broad, Forge marks the work Large and recommends splitting it rather than extending the interview indefinitely.

## 3. Summarize

Forge presents a compact decision summary containing:

- goal
- current behavior and repository evidence
- scope and non-goals
- approach and important boundaries
- likely change surface
- Small, Medium, or Large change size
- material risks or unknowns
- verification
- suggested slices for Large work

The user chooses **implement**, **revise**, **split**, or **stop** in ordinary language.

## 4. Implement

Forge remains read-only until the user chooses implementation. That decision authorizes the described scope.

Forge then works through implementation and verification without intermediate approval gates. It pauses only when scope changes materially, a key assumption fails, destructive or external action becomes necessary, or the work is substantially larger than described.

## 5. Report

Forge reports:

- what changed
- verification performed and its result
- checks not run
- remaining uncertainty

Completion is an evidence claim, not a confidence statement.
