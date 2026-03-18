# Planforge tooling

This document covers the helper scripts, rolling-plan file updates, and smoke checks.

## State root

By default, Planforge stores state under:

```text
~/.planforge/
```

To override that location, set:

```bash
export PLANFORGE_HOME=/some/other/location
```

Plan files then live under:

```text
${PLANFORGE_HOME:-~/.planforge}/plans/<repo>/<branch>.md
```

Deferred follow-up plans for later sessions live under:

```text
${PLANFORGE_HOME:-~/.planforge}/plans/<repo>/next/
```

## Helper scripts

- `plan-context` — print repo, branch, and plan-path context
- `plan-init` — create the rolling plan if missing
- `plan-set-section` — replace a managed section from stdin
- `plan-append-item` — append a backlog item or checkpoint
- `plan-list` — list saved rolling plans only (excludes the deferred next queue)
- `plan-branch-name` — generate semantic branch names such as `feat/hn-top-cli`
- `plan-next-init` — create a deferred follow-up plan under `${PLANFORGE_HOME:-~/.planforge}/plans/<repo>/next/`
- `plan-next-list` — list deferred follow-up plans for the current repo from the shared next queue
- `scorecard-init` — create an optional benchmark scorecard file under `benchmarks/results/`

## Rolling-plan updates

Planforge uses a simple Markdown file with managed sections. The helpers exist to keep updates deterministic and token-cheap.

Typical operations:
- initialize a plan
- set current goal
- replace tasks
- replace the test table
- append a checkpoint
- append a backlog item
- list saved plans

## Smoke checks

Run:

```bash
./tests/test-plan-scripts.sh
./tests/test-pi-package.sh
```

These cover the helper scripts, package shape, and key documentation contracts.
