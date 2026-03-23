# Planforge on Pi

## Install

Global install from git:

```bash
pi install git:github.com/javiermolinar/planforge
```

Or from a local checkout while developing:

```bash
pi install /absolute/path/to/planforge
```

`git:` sources are cached clones managed by Pi. If you want Pi to use your existing checkout directly, install by local path.

## Use

Once installed, start with:

```text
/skill:planforge
```

Planforge is supervised by default:
- it stays read-only until approval
- it expects a compact approval-ready plan packet with review gates before first mutation approval
- use `/pf` to approve the first mutating scope
- use `/pf` again at review gates or after scope changes
- use `/pf status` to inspect current gate state

For workflow semantics, see `docs/flow.md`.

## Package management

- `pi list` shows installed packages
- `pi config` enables or disables package resources
- `pi update` updates non-pinned installs

## Notes

- Planforge ships as a Pi package with skills under `skills/` and an approval-gate extension under `extensions/`.
- Helper scripts live under `scripts/`.
- Rolling plans are written under `${PLANFORGE_HOME:-~/.planforge}/plans/`.
- For external API or benchmark work, prefer a fresh-context verification/review pass before final completion claims.

## Approval gate extension

Planforge includes a lightweight stateful approval gate:

- auto-enables when you start with `/skill:planforge`
- blocks mutating tool calls before approval
- expects `## Proposed Review Gates` before first mutation approval
- preserves parsed review-gate context when replanning

Before `/pf`, mutating tool calls are blocked (`edit`, `write`, and non-allowlisted `bash`). Strict read-only `curl` is allowed only for safe GET/HEAD-style requests; narrow read-only pipelines such as `git status | wc -l` are allowed, but upload/data/output flags and write-oriented shell patterns remain blocked.

## Publishing later

For a public release, keep `keywords: ["pi-package"]` in `package.json` and install from git or npm once you are ready to publish.
