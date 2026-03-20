# Planforge flow

## Default behavior

Planforge is opinionated:
- always plan before non-trivial implementation
- challenge overengineering firmly
- prefer the simpler path
- stay single-agent by default
- suggest multiagent or worktrees only when worth the overhead
- use supervised execution by default via `/skill:planforge` (approve the first mutating scope, execute bounded work inside that scope, stop again at review gates or scope changes)

## Design philosophy

Planforge keeps philosophy canonical in `docs/philosophy.md`.

Use `docs/philosophy.md` as the source of truth for:
- complexity dimensions (change amplification, cognitive load, dependency surface, obscurity, unknown unknowns)
- deep-vs-shallow module guidance
- tactical/strategic split (80/20)
- broken-window rule
- canonical red flags

`docs/flow.md` focuses on operational workflow and policy; `docs/philosophy.md` defines the principles.

## Execution modes

Canonical mode matrix lives in `docs/modes.md`.

- `planforge` (default): supervised mode for serious development workflows.
  - propose explicit checkpoints and review boundaries so scope stays legible
  - explicit approval (`/pf`) before the first mutating scope
  - after approval, continue inside that scope until a review gate is reached
  - if a scenario result is awaiting acceptance, `/pf` records acceptance first and may approve the next scope
  - if the approved plan declared a bounded closeout lane, final review acceptance may transition into a minor closeout scope for docs/verification/commit/push/PR work
  - material scope changes still trigger re-planning and re-approval
- `planforge-fast`: unsupervised mode when speed is prioritized.
  - still requires scope approval before non-trivial mutation
  - no checkpoint approval loop after scope approval
  - recommend switching back to supervised mode if risk grows

## Terminology (canonical)

Use these terms consistently:

- **Phase**: a larger roadmap chunk that may contain multiple implementation steps.
- **Step**: a user-visible unit of incremental delivery tracked in the implementation ledger.
- **Scenario**: synonym for step outcome during acceptance discussion.
- **Checkpoint**: the approval/execution boundary for mutating work in supervised mode.

Operational mapping:
- In supervised mode, a checkpoint usually executes one step/scenario slice.
- A step is not complete until user acceptance is explicit.

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
- shipment footer (when shipped)

The planning process should also surface:
- a complexity check
- architecture decisions (with rationale)
- key tradeoffs (with explicit costs/benefits)
- architecture/tradeoff quality rubric (pass/fail with evidence)
- implementation step ledger (updated every checkpoint)
- per-step TDD table when TDD applies
- scenario acceptance gating (do not advance until user confirms satisfaction)
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
- After installation, use `/skill:planforge` (supervised), `/skill:planforge-fast` (unsupervised), or `/skill:forge-investigate`.
- `pi config` can enable or disable resources from the package.
- On Pi, the packaged approval-gate extension enforces read-only behavior before approval by blocking `edit`, `write`, and mutating `bash` tool calls.
- For external API tasks, Planforge should suggest a fresh-context review handoff before claiming completion.
