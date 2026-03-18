# Planforge on Pi

## Install

For a project-local install:

```bash
pi install git:github.com/javiermolinar/planforge -l
```

Or from a local checkout:

```bash
pi install /absolute/path/to/planforge -l
```

If you prefer a global install, drop `-l`.

## Use

Once installed, Pi discovers the skills automatically.

Start with:

```text
/skill:planforge
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

- Planforge ships as a Pi package with skills under `skills/`.
- The package keeps helper scripts in `scripts/` and skills can reference them relatively.
- Rolling plans are written under `${PLANFORGE_HOME:-~/.planforge}/plans/`.
- Semantic branch and commit conventions also apply on Pi.
- For external API and benchmark work, Planforge should prefer a fresh-context review handoff before final completion claims.

## Publishing later

For a public release, keep `keywords: ["pi-package"]` in `package.json` and install from git or npm once you are ready to publish.
