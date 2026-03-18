# Planforge flow

## Default behavior

Planforge is opinionated:
- always plan before non-trivial implementation
- challenge overengineering firmly
- prefer the simpler path
- stay single-agent by default
- suggest multiagent or worktrees only when worth the overhead

## Design philosophy

Planforge treats complexity as the main enemy.

Good changes:
- reduce change amplification
- reduce cognitive load
- reduce dependency surface
- reduce obscurity
- turn unknown unknowns into explicit risks, questions, or tests

Bad changes:
- spread one behavior across too many places
- increase the amount a reader must keep in mind
- add dependencies without enough leverage
- hide behavior behind indirection, vague naming, or unclear ownership

## Branch policy

- On `main` / `master` / trunk-like branches, non-trivial implementation should move to a new branch after plan approval.
- On an unrelated feature branch, create a new branch after plan approval.
- On a matching feature branch, continue and reuse its rolling plan.
- Use semantic branch names such as `feat/<slug>`, `fix/<slug>`, `refactor/<slug>`, `docs/<slug>`, `chore/<slug>`, or `test/<slug>`.
- Infer the type when obvious; ask when ambiguous.
- Worktrees are optional and suggested only for isolation, risk, or parallel work.

## Rolling plan contents

Each plan contains:
- current goal
- tasks checklist
- test table
- backlog
- checkpoints

The planning process should also surface:
- a complexity check
- dependencies
- obscurity and unknowns

Plan files use managed section markers so shell helpers can update them cheaply and predictably. Use `plan-list` to discover saved plans across repos and branches. Use `plan-branch-name` when you want deterministic semantic branch naming without spending extra tokens formatting a slug.

## Persistence policy

- The first rolling plan is created automatically after approval.
- Later updates are suggested at meaningful milestones.
- Commits are suggested, not made automatically.
- Suggested commit messages should use the same light semantic convention, such as `feat: ...`, `fix: ...`, `refactor: ...`, `docs: ...`, `chore: ...`, or `test: ...`.
- After successful verification, suggest a semantic commit message and whether the branch should likely be squashed later.
- Squashing is suggested before integration when history is noisy.

## Pi package notes

- Planforge can be installed with `pi install /absolute/path/to/planforge`.
- After installation, use `/skill:planforge` or `/skill:forge-investigate` to start explicitly.
- `pi config` can enable or disable resources from the package.
- For external API tasks, Planforge should suggest a fresh-context review handoff before claiming completion.
