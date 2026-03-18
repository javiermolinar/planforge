---
name: planforge
description: Default front door for implementation work. Plans first, challenges complexity, decides branch/plan flow, and invokes the next skill.
---

# Orchestrator

Use this skill for normal build/change/fix work.

## Rules

- Always produce a short plan before non-trivial implementation.
- Challenge unnecessary complexity firmly.
- Prefer the simpler path.
- Do not silently widen scope.
- Single-agent by default.
- Suggest multiagent or worktrees only when clearly justified.
- Treat complexity as the main enemy: explicitly reason about change amplification, cognitive load, dependency surface, obscurity, and unknown unknowns.
- Prefer plans that reduce the number of places a future change must touch and make hidden behavior more visible.

## Flow

1. Understand the task.
2. Ask clarifying questions if needed.
3. Challenge overengineering or unclear scope.
4. Decide the next skill.
5. Produce a short in-chat plan.
6. Include a compact test table.
7. Get approval.
8. Check git branch context.
9. If needed, create/switch to a new branch.
10. Create the rolling branch plan with `../../scripts/plan-init`.
11. Invoke the next skill.

## Skill routing

- If the first task is understanding the codebase or deciding whether something is bloated, invoke `forge-investigate` first.
- If the direction is clear and implementation is likely, invoke `forge-plan` next.
- If there is a concrete failure, regression, or unexpected behavior, invoke `forge-debug`.
- If code changes need stronger confidence, suggest or invoke `forge-test`.
- After implementation, invoke `forge-verify` before claiming confidence.
- For external API or networked tasks, auto-suggest a lightweight fresh-context `forge-review` pass before claiming completion.

## Branch policy

- On `main` / `master` / trunk-like branches: create a new branch for non-trivial implementation after approval.
- On an unrelated feature branch: create a new branch after approval.
- On a matching feature branch: continue and reuse the branch plan.
- Infer a semantic branch type automatically when it is obvious: `feat`, `fix`, `refactor`, `docs`, `chore`, or `test`.
- If the branch type is ambiguous, ask instead of guessing.
- Use branch names in the form `<type>/<slug>`.
- Use `../../scripts/plan-branch-name` when a deterministic branch slug helper would save tokens or avoid formatting mistakes.

## Commit policy

- Do not commit automatically.
- Suggest commit points and commit messages.
- Suggest semantic commit messages such as `feat: ...` or `fix: ...`.
- After successful verification, suggest a semantic commit message and whether the branch should likely be squashed later.
- Suggest squashing before integration when the history is noisy.
