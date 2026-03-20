# Planforge on Pi

## Install

For a global install from git (available in all repos):

```bash
pi install git:github.com/javiermolinar/planforge
```

Or from a local checkout (recommended while developing Planforge itself):

```bash
pi install /absolute/path/to/planforge
```

`git:` sources are cached clones managed by Pi, so a later `pi install`/`pi update` may run `git pull` inside that cache directory. If you want Pi to use your existing checkout directly, install by local path.

Use `-l` only if you want a project-local install for the current repository.

## Use

Once installed, Pi discovers the skills automatically.

Start with:

```text
/skill:planforge
```

`/skill:planforge` is supervised by default (approve the first mutating scope with `/pf`, then keep work inside that approved scope until a review gate or scope change requires another `/pf`).

If you prefer faster unsupervised execution, use:

```text
/skill:planforge-fast
```

Use `forge-investigate` when the first job is discovery: understanding the code, tracing behavior, mapping dependencies, or reducing unknown unknowns before implementation.

## Package management

- `pi list` shows installed packages
- `pi config` lets you enable or disable package resources
- `pi update` updates non-pinned package installs
- `plan-list` lists saved rolling plans under `${PLANFORGE_HOME:-~/.planforge}/plans/`
- `plan-ship` marks the current rolling plan as shipped and appends a shipment footer
- `scorecard-init` creates an optional scorecard file under `benchmarks/results/` in the current repository

## Notes

- Planforge ships as a Pi package with skills under `skills/` and a policy extension under `extensions/`.
- The package keeps helper scripts in `scripts/` and skills can reference them relatively.
- Rolling plans are written under `${PLANFORGE_HOME:-~/.planforge}/plans/`.
- Semantic branch and commit conventions also apply on Pi.
- For external API and benchmark work, Planforge should prefer a fresh-context review handoff before final completion claims.

## Approval gate extension

Planforge includes a lightweight stateful approval gate for Pi:

- Auto-enables when you start with `/skill:planforge` or mutating `forge-*` workflows.
- In supervised mode, use `/pf` to approve the current mutating scope; keep work inside that scope until a review gate or scope change requires another `/pf`.
- Before first mutation approval in supervised mode, plans should include `## Proposed Review Gates` so humans can accept/edit review boundaries.
- Plans should also extract repo obligations up front and may declare a bounded `## Closeout Scope` for predictable trailing work such as docs regen, mandated verification, commit, push, and PR drafting.
- In supervised flow, `/pf` approves mutation scope and is reused at review gates (not per-command approvals).
- If a review gate is awaiting acceptance, `/pf` records acceptance and can approve the next scope in one step.
- When the final review gate is accepted and a closeout lane was declared, Planforge can enter an approved closeout scope instead of forcing a full re-plan.
- In `/skill:planforge-fast`, the gate stays off (unsupervised mode) after explicit plan/scope acceptance.
- In `/skill:forge-investigate`, checkpoint approvals stay off and a read-only guard blocks mutating tools (no `/pf` needed).
- Before `/pf`, mutating tool calls are blocked (`edit`, `write`, and non-allowlisted `bash`).
- Additional non-trivial follow-up prompts after approval are treated as scope changes and revoke approval.
- Use `/pf benchmark on` to enable benchmark-profile guidance (strict scope + minimum verification evidence), and `/pf benchmark off` to disable it.
- Benchmark profile may auto-enable when prompts explicitly mention benchmark/evaluation/scorecard context.
- Use `/pf status` for a right-side overlay panel with current state on demand (including parsed review gates and per-gate status).

## Publishing later

For a public release, keep `keywords: ["pi-package"]` in `package.json` and install from git or npm once you are ready to publish.
