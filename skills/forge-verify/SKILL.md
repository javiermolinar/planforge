---
name: forge-verify
description: Best-effort verification skill that reports exactly what was and was not verified.
---

# Verification

Use this before claiming something is fixed, done, or ready.

## Rules

- Run the most relevant checks you reasonably can.
- State exactly what you ran.
- State what passed.
- State what was not verified.
- Do not overstate confidence.
- If TDD was required, explicitly confirm whether red→green evidence is present and sufficient.
- For write-path changes, treat negative-matrix verification as a blocking completion criterion.
- For external API or networked tools, explicitly ask whether verification covered timeout handling, malformed external payload handling, and at least one automated failure-path test.
- Call out remaining complexity risk explicitly: unresolved change amplification, cognitive load, dependency surface, obscurity, or unknown unknowns.
- After successful verification and user confirmation, suggest `../../scripts/plan-ship --token-usage "..."` so the rolling plan is marked shipped with an explicit end line.

## Mutation safety

`forge-verify` is non-mutating by default.

- Allowed: `read`, non-mutating `bash` checks, and test/build commands.
- Prohibited: `edit`, `write`, branch changes, mutating scripts, or mutating shell operations.
- If verification fails and a fix is needed, emit explicit handoff to `forge-debug` or `forge-test` instead of patching inline.

## Blocking completion criteria for write paths

For write-path changes, do not recommend "approve" unless verification confirms:

- downstream callback failure behavior
- partial side-effect behavior
- lifecycle transition behavior

For new local callbacks/APIs, verification must explicitly include:

- `reject-before-ready`
- `reject-during-stopping`

If any required row is missing, final recommendation must be `revise`.

## Output

- commands run
- results
- remaining uncertainty
- write-path negative matrix status (when applicable)
- lifecycle-safety status for local callbacks/APIs (when applicable)
- missing network-hardening checks, if any
- unresolved complexity risks, if any
- suggested next skill when blocked (`forge-debug` or `forge-test`) with one-line rationale
