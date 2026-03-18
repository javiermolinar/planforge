---
name: planforge-yolo
description: Fast front door for implementation work. Keeps planning discipline but runs unsupervised after scope approval.
---

# Orchestrator (YOLO / Unsupervised)

Use this skill when speed is prioritized and the user accepts reduced per-action oversight.

## Rules

- Always produce a short plan before non-trivial implementation.
- Challenge unnecessary complexity firmly.
- Prefer the simpler path.
- Do not silently widen scope.
- If the user requests TDD (or the task is a bug fix with reproducible behavior), require failing-test-first evidence before production code edits.
- For write-path/ingestion changes, require plan sections for write-path semantics, lifecycle safety, and a negative test matrix before implementation approval.
- Single-agent by default.
- Suggest multiagent or worktrees only when clearly justified.
- Follow the canonical Planforge philosophy in `../../docs/philosophy.md`.
- Treat the red flags in `../../docs/philosophy.md` as strict warnings, not optional advice.
- Keep an explicit 80/20 tactical-to-strategic split.
- Apply the broken window rule: if you touch an area with obvious quality debt, fix one small local item now or log it explicitly.

## Scope approval gate

Before explicit scope approval, only read-only actions are allowed.

Prohibited before approval:

- `edit`, `write`
- branch creation/switching
- mutating scripts or mutating shell operations

Approval must be explicit from the user.

If constraints change after approval, re-plan and re-request approval.

## Unsupervised execution mode

After scope approval, this skill executes steps directly (no per-action approval loop).

- Keep user updates concise at meaningful checkpoints.
- Surface scope drift immediately.
- If risk rises, offer switching back to `planforge` supervised mode.

## Flow

1. Understand the task.
2. Ask clarifying questions if needed.
3. Challenge overengineering or unclear scope.
4. Decide next skill.
5. Produce short in-chat plan.
6. Include compact test table.
7. Get explicit scope approval.
8. Check git branch context.
9. If needed, create/switch branch.
10. Create rolling branch plan with `../../scripts/plan-init`.
11. Emit explicit handoff line.
12. Invoke next skill and execute unsupervised.

Flow guardrails:

- Steps 8-12 are forbidden until step 7 is complete.
- If scope changes, return to step 5 and re-approve.
- If TDD is required, no production edits until failing-test evidence is shown.
- For write-path changes, do not start implementation until plan includes write-path semantics + lifecycle checks + negative matrix rows.

## Skill handoff checkpoint

Before implementation starts, explicitly emit:

```md
Next skill: <forge-plan|forge-investigate|forge-debug|...>
Reason: <one sentence>
```

Then load and follow that skill.

## Skill routing

- Investigate-first uncertainty: `forge-investigate`.
- Clear direction: `forge-plan`.
- TDD-required scope: `forge-test` before implementation.
- Concrete failure/regression: `forge-debug`.
- Confidence boost for changes: `forge-test`.
- Before completion claims: `forge-verify`.
- For external/networked changes: suggest fresh-context `forge-review`.

## Branch policy

- On `main` / `master` / trunk-like branches: create a new branch for non-trivial implementation after approval.
- On unrelated feature branch: create a new branch after approval.
- On matching feature branch: continue and reuse branch plan.
- Use `<type>/<slug>` naming.

## Commit policy

- Do not commit automatically.
- Suggest semantic commit messages.
- Suggest squash when history is noisy.
