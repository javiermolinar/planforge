# Planforge on Pi

## Install

Install from a local checkout:

```bash
pi install /absolute/path/to/planforge
```

Or from git:

```bash
pi install git:github.com/your-org/planforge
```

## Use

Once installed, Pi discovers the skills automatically.

Typical starting points:

```text
/skill:orchestrator
/skill:investigation
```

Use `orchestrator` for normal implementation work. Use `investigation` when the first job is understanding the code, tracing behavior, or deciding whether something is bloated.

## Package management

- `pi list` shows installed packages
- `pi config` lets you enable or disable package resources
- `pi update` updates non-pinned package installs
- `plan-list` lists saved rolling plans under `~/.planforge/plans/`
- `scorecard-init` creates an optional scorecard file under `benchmarks/results/` in the current repository

## Notes

- Planforge ships as a Pi package with skills under `skills/`.
- The package keeps helper scripts in `scripts/` and skills can reference them relatively.
- Rolling plans are written under `~/.planforge/plans/`.
- Semantic branch and commit conventions also apply on Pi.
- For external API and benchmark work, Planforge should prefer a fresh-context review handoff before final completion claims.

## Publishing later

For a public release, keep `keywords: ["pi-package"]` in `package.json` and install from git or npm once you are ready to publish.
