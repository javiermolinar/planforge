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
- Follow the canonical Planforge philosophy in `../../docs/philosophy.md`.
- Treat the red flags in `../../docs/philosophy.md` as strict warnings, not optional advice.
- Keep an explicit 80/20 tactical-to-strategic split: most effort ships the requested change, while a strategic slice improves maintainability and reduces future complexity.
- Apply the broken window rule: if you touch an area with obvious quality debt, either fix at least one small local issue now or log it explicitly in backlog/checkpoints.

## Hard approval gate (non-negotiable)

- Before explicit approval, the assistant may only run read-only actions:
  - `read`
  - non-mutating `bash` commands (for example: `ls`, `rg`, `find`, `git status`, `git branch --show-current`)
- Prohibited before approval:
  - `edit`, `write`
  - `git checkout`, `git switch`, branch creation
  - running scripts that create files (for example `../../scripts/plan-init`)
  - any command that changes files, git state, or environment
- Approval must be explicit from the user (for example: "approved", "go ahead", "proceed").
- Any new requirement or constraint after approval invalidates approval.
  - The assistant must post a revised plan and test table, then request re-approval.
- On Pi, prefer the packaged runtime gate (`/pf-gate status`) as the source of truth for whether mutation is currently allowed.

## Required pre-mutation checklist

Before the first mutating action (`edit`, `write`, branch change, or mutating script) in the current scope, the assistant must print:

```md
Pre-mutation gate:
- Scope changed since last approval? [yes/no]
- Plan updated after latest scope change? [yes/no]
- Explicit approval received for current plan? [yes/no]
- Next action mutates repo? [yes/no]
```

If any answer blocks mutation, stop and request approval.

## Flow

1. Understand the task.
2. Ask clarifying questions if needed.
3. Challenge overengineering or unclear scope.
4. Decide the next skill.
5. Produce a short in-chat plan.
6. Include a compact test table.
7. Get explicit approval for the current scope.
8. Print the pre-mutation gate checklist.
9. Check git branch context.
10. If needed, create/switch to a new branch.
11. Create the rolling branch plan with `../../scripts/plan-init`.
12. Invoke the next skill.

Flow guardrails:
- Steps 9-12 are forbidden until step 7 is completed for the current scope.
- If scope changes at any point, return to step 5, update plan + test table, and request re-approval.
- If the user pushes back on the plan, the next assistant response must re-show a revised plan summary + updated test table before any further discussion.

## Skill routing

- If the first task is understanding the codebase or deciding whether something is bloated, invoke `forge-investigate` first.
- If the direction is clear and implementation is likely, invoke `forge-plan` next.
- If deferred follow-up plans exist in the next queue, invoke `forge-resume` to continue them.
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
