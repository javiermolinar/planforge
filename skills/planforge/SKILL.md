---
name: planforge
description: Supervised-by-default front door for implementation work. Plans first, challenges complexity, and requires explicit approval at phase/task checkpoints.
---

# Orchestrator (Supervised Default)

Use this skill for normal build/change/fix work when safety and operator control matter.

## Rules

- Always produce a short plan before non-trivial implementation.
- Challenge unnecessary complexity firmly.
- Prefer the simpler path.
- Do not silently widen scope.
- If the user requests TDD (or the task is a bug fix with reproducible behavior), require failing-test-first evidence before production code edits.
- For write-path/ingestion changes, require plan sections for write-path semantics, lifecycle safety, and a negative test matrix before implementation approval.
- Require planning output to include explicit architecture decisions, tradeoff highlights, a passing architecture/tradeoff quality rubric, and an implementation step ledger before implementation approval.
- Single-agent by default.
- Suggest multiagent or worktrees only when clearly justified.
- Follow the canonical Planforge philosophy in `../../docs/philosophy.md`.
- Treat the red flags in `../../docs/philosophy.md` as strict warnings, not optional advice.
- Keep an explicit 80/20 tactical-to-strategic split: most effort ships the requested change, while a strategic slice improves maintainability and reduces future complexity.
- Apply the broken window rule: if you touch an area with obvious quality debt, either fix at least one small local issue now or log it explicitly in backlog/checkpoints.
- This skill is **supervised by default**: request explicit approval at mutating checkpoints (phase transitions and implementation-task boundaries), not for every individual command.

## Scope approval gate (non-negotiable)

Before explicit scope approval, the assistant may only run read-only actions:

- `read`
- non-mutating `bash` (for example: `ls`, `rg`, `find`, `git status`, `git branch --show-current`)

Prohibited before scope approval:

- `edit`, `write`
- `git checkout`, `git switch`, branch creation
- running scripts that create or mutate files (for example `../../scripts/plan-init`, `../../scripts/plan-set-section`)
- mutating `bash` commands (for example redirection `>` / `>>`, `tee`, `sed -i`, write-mode formatters/fixers)
- any command that changes files, git state, or environment

Approval must be explicit from the user (use `/pf-continue` in supervised mode).

If requirements/constraints change after approval, approval is invalidated. Re-post plan + test table and re-request approval.

## Required pre-mutation checklist

Before starting a mutating checkpoint in the current scope, print:

```md
Pre-mutation gate:
- Scope changed since last approval? [yes/no]
- Plan updated after latest scope change? [yes/no]
- Explicit approval received for current plan? [yes/no]
- Runtime/harness gate allows mutation now? [yes/no]
- TDD required for this scope? [yes/no]
- If TDD required: failing test reproduced before production edits? [yes/no]
- Next checkpoint includes repo mutation? [yes/no]
```

If any answer blocks mutation, stop and request approval.

## Supervised checkpoint loop (default)

After scope approval, run by checkpoint instead of per-command approvals.

Approval checkpoints are:
- plan -> implementation transition (first mutating phase)
- each implementation task boundary (before starting a task with mutations)
- any material scope change or strategy change

Within an approved checkpoint, execute the bounded set of commands needed to complete that checkpoint.

Checkpoint proposal format:

```md
Proposed checkpoint: C<n>
- Phase/Task: <phase name or task id/title>
- Mutating: <yes/no>
- Planned operations: <short list of expected commands/edits>
- Purpose: <why now>
- Expected outcome: <what will be complete when this checkpoint ends>
```

Rules:

- Do not ask for `/pf-continue` for purely read-only investigation steps.
- Do not bundle unrelated phases/tasks into one checkpoint approval.
- If checkpoint scope changes materially, issue a new checkpoint id and re-request approval.
- If user says reject, propose a revised checkpoint.
- After each completed scenario/checkpoint, require explicit user satisfaction before advancing to the next scenario.
- If user pushback indicates the scenario is not right, stay on the same scenario, propose a correction checkpoint, and do not advance.

## Skill handoff checkpoint

Before implementation starts, explicitly emit:

```md
Next skill: <forge-plan|forge-investigate|forge-debug|...>
Reason: <one sentence>
```

Then load that skill and follow it.

## Flow

1. Understand the task.
2. Ask clarifying questions if needed.
3. Challenge overengineering or unclear scope.
4. Decide the next skill.
5. Produce a short in-chat plan.
6. Include a compact test table.
7. Get explicit approval for the current scope.
8. Print pre-mutation checklist.
9. Check git branch context.
10. If needed, create/switch to a new branch.
11. Create rolling branch plan with `../../scripts/plan-init`.
12. Emit explicit skill handoff line.
13. Invoke the next skill.
14. Enter supervised checkpoint loop (propose checkpoint → approve → execute bounded work).

Flow guardrails:

- Steps 9-14 are forbidden until step 7 is complete.
- If scope changes at any point, return to step 5 and re-approve.
- If TDD is required, no production code edits until failing test evidence is shown, and require a per-step TDD table for checkpoint reporting.
- If user pushes back on the plan, next response must include revised plan summary + updated test table.
- If user pushes back on an implementation scenario/checkpoint result, do not advance; revise that same scenario until user confirms satisfaction.
- Do not approve implementation start until plan includes explicit architecture decisions, tradeoff highlights, a passing architecture/tradeoff quality rubric, and an implementation step ledger.
- For write-path changes, do not approve implementation start until plan includes: side-effect order, fail-open/fail-closed policy, retry implications, idempotency expectations, lifecycle checks, and negative matrix rows.

## Skill routing

- If the first task is understanding the codebase or deciding whether something is bloated, invoke `forge-investigate` first.
- If the direction is clear and implementation is likely, invoke `forge-plan` next.
- If TDD is required, invoke `forge-test` before any implementation skill and obtain failing-test evidence first.
- If deferred follow-up plans exist in the next queue, invoke `forge-resume`.
- If there is a concrete failure/regression, invoke `forge-debug`.
- If code changes need stronger confidence, suggest/invoke `forge-test`.
- After implementation, invoke `forge-verify` before claiming confidence.
- For external API or networked tasks, auto-suggest a lightweight fresh-context `forge-review` pass before completion.
- If the user explicitly wants speed over supervision, switch to `planforge-fast`.

## Branch policy

- On `main` / `master` / trunk-like branches: create a new branch for non-trivial implementation after approval.
- On an unrelated feature branch: create a new branch after approval.
- On a matching feature branch: continue and reuse the branch plan.
- Infer semantic branch type when obvious: `feat`, `fix`, `refactor`, `docs`, `chore`, or `test`.
- If ambiguous, ask instead of guessing.
- Use branch names in `<type>/<slug>`.
- Use `../../scripts/plan-branch-name` when helpful.

## Commit policy

- Do not commit automatically.
- Suggest commit points and messages.
- Suggest semantic messages such as `feat: ...` / `fix: ...`.
- After verification, suggest semantic commit message and whether to squash noisy history.
