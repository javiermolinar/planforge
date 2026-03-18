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

`/skill:planforge` is supervised by default (propose one action, approve one action, execute one action).

If you prefer faster unsupervised execution, use:

```text
/skill:planforge-yolo
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

Planforge includes a stateful approval gate for Pi:

- Auto-enables when you start with `/skill:planforge` or `/skill:forge-*`.
- If you start with `/skill:planforge-yolo`, enable it manually with `/pf-gate on` when you still want runtime mutation blocking.
- Blocks `edit`, `write`, and mutating `bash` commands until explicit approval is active.
- Treats additional non-trivial follow-up prompts after approval as scope changes and revokes approval.

Manual control command:

```text
/pf-gate status | on | off | approve | revoke | scope-changed | policy [strict|balanced]
```

Use this when you need to override or inspect the gate state explicitly.

Bash policy modes before approval:
- `strict` — only allows: `ls`, `rg`, `find`, `git status`, `git branch --show-current`
- `balanced` — allows a broader read-only inspection set (default)

Set the default mode for new sessions with:

```bash
export PLANFORGE_GATE_BASH_POLICY=strict   # or balanced
```

## Publishing later

For a public release, keep `keywords: ["pi-package"]` in `package.json` and install from git or npm once you are ready to publish.
