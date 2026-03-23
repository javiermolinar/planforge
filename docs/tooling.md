# Planforge tooling

This document covers the remaining rolling-plan helpers and smoke checks.

## State root

By default, Planforge stores state under:

```text
~/.planforge/
```

To override that location, set:

```bash
export PLANFORGE_HOME=/some/other/location
```

Plan files live under:

```text
${PLANFORGE_HOME:-~/.planforge}/plans/<repo>/<branch>.md
```

## Helper scripts

Public rolling-plan helpers:

- `plan-init` — create the rolling plan if missing
- `plan-set-section` — replace a managed section from stdin
- `plan-append-item` — append a backlog item or checkpoint
- `plan-ship` — mark a plan as shipped and write a shipment footer (token usage + end line)

Internal helper:

- `plan-context` — print repo, branch, and plan-path context for other scripts

## Rolling-plan updates

Planforge uses a simple Markdown file with managed sections. The helpers exist to keep updates deterministic and token-cheap.

Typical operations:
- initialize a plan
- set current goal
- replace tasks
- replace the test table
- append a checkpoint
- append a backlog item
- mark the plan as shipped and add a shipment footer

## Smoke checks

Run:

```bash
./tests/test-plan-scripts.sh
./tests/test-pi-package.sh
```

These cover the remaining helper scripts, package shape, and key documentation contracts.
