# Planforge

![GitHub last commit](https://img.shields.io/github/last-commit/javiermolinar/planforge?style=flat-square)
![Pi package](https://img.shields.io/badge/pi-package-6b8afd?style=flat-square)
![Status](https://img.shields.io/badge/status-experimental-bf8700?style=flat-square)
[![CI](https://github.com/javiermolinar/planforge/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/javiermolinar/planforge/actions/workflows/ci.yml)
![Docs](https://img.shields.io/badge/docs-flow%20%7C%20pi%20%7C%20tooling-5c677d?style=flat-square)

![Planforge](./forge.png)

Planforge is a lightweight workflow for the **Pi agent harness** built for serious software development. It favors discipline over vibes: plan first, verify claims, review with fresh eyes, and ship code worthy of Olympus.

Planforge is for developers who want agents to behave more like strong engineers and less like autocomplete with delusions of grandeur.

It favors:
- short, explicit planning before implementation
- firm pushback against unnecessary complexity
- single-agent execution by default
- best-effort verification with honest reporting
- fresh-context review for riskier work
- lightweight rolling plans instead of heavyweight specs

Philosophy source of truth: [`docs/philosophy.md`](docs/philosophy.md)

## Zen of Planforge

1. Compose small interfaces, keep modules deep.
2. Be explicit: surface contracts, dependencies, and unknowns.
3. Prefer one obvious path over clever alternatives.
4. Fail loudly, verify claims, and never hide ambiguity.
5. Ship tactically, improve strategically.

This is baked from years of real engineering tradeoffs, and from hard-won lessons shared by people like **Rob Pike, Ken Thompson, Brian Kernighan, John Ousterhout, and Rich Hickey**.

> “Simplicity is prerequisite for reliability.” — Edsger W. Dijkstra

## Why it feels different

Most agent workflows optimize for momentum. Planforge optimizes for judgment.

It pushes back when the plan is bloated, prefers small honest steps over dramatic leaps, and treats verification as evidence instead of theater. When the work is risky, it asks for fresh eyes instead of trusting the builder's own victory speech.

This is not a temple for vibecoding. It is a forge.

## Example

In Pi (supervised default):

```text
/skill:planforge Build a small read-only Hacker News CLI. Keep it minimal, plan first, and challenge unnecessary complexity.
```

Planforge should then:
1. clarify the scope
2. produce a short plan and test table
3. get explicit scope approval
4. create a semantic branch if needed
5. create a rolling plan
6. propose one action at a time and wait for `/continue`
7. verify each meaningful step
8. suggest a fresh-context review before completion

## Quickstart

### Pi

Global install from git (available in all repos):

```bash
pi install git:github.com/javiermolinar/planforge
```

Or install from a local checkout (recommended while developing Planforge itself):

```bash
pi install /absolute/path/to/planforge
```

Use `-l` only if you want a project-local install for the current repo.

`git:` sources are managed clones under `~/.pi/agent/git/` (or `.pi/git/` with `-l`), so Pi may run `git pull` on later installs/updates. If you want Pi to use your current working tree directly, install by local path.

### Modes

| Mode | Start command | Best for | Behavior |
|---|---|---|---|
| Supervised (default) | `/skill:planforge` | serious/high-risk work | Propose one action at a time and wait for explicit `/continue` before execution |
| Unsupervised (fast) | `/skill:planforge-fast` | faster iteration with less oversight | Executes without per-action approvals after scope approval |

### Supervised approvals (Pi)

Planforge ships a lightweight approval gate extension:

- In `/skill:planforge`, mutating tool calls are blocked until you send `/continue`.
- In `/skill:planforge-fast`, the gate stays off (unsupervised mode).
- If scope changes after approval, the gate revokes approval and requires `/continue` again.
- A lightweight dashboard widget is always visible with gate status + top TODOs.
- Use `/pf-todo` to manage checklist items (`add`, `done`, `undone`, `rm`, `clear`, `list`).
- Use `/pf-overlay` to open a right-side overlay with full state + todo details.

Use `/skill:forge-investigate` when the first task is discovery (understanding code reality, tracing dependencies, or reducing unknown unknowns) before implementation.

Use `/skill:forge-resume` to continue deferred follow-up plans from the shared next queue.

### Scope

Planforge is currently maintained as a **Pi-focused package**. The docs, extension behavior, and workflow examples assume Pi semantics.

## Rolling plans

Planforge keeps one rolling plan per working branch. It is created after plan approval and updated at meaningful checkpoints so work stays resumable without turning into a heavyweight spec system.

When work ships, `plan-ship` can mark the plan as `shipped` and append a compact shipment footer (token usage + explicit end line).

By default, Planforge stores state under `~/.planforge/`. To override that location, set `PLANFORGE_HOME`.

## CI and releases

- CI runs in GitHub Actions on push/PR and executes:
  - `tests/test-plan-scripts.sh`
  - `tests/test-pi-package.sh`
- Releases are tag-driven (`v*`) and automatically published via GitHub Actions.

## Learn more

- `docs/pi.md` — Pi-specific install and usage notes
- `docs/flow.md` — workflow, branch policy, semantic conventions, and review handoff
- `docs/philosophy.md` — design philosophy, deep modules, and red flags
- `docs/tooling.md` — helper scripts, rolling-plan commands, and smoke checks
- `docs/releases.md` — version tags, release process, and CI/release automation
- `docs/evaluation.md` — benchmarks and scoring model
- `benchmarks/README.md` — repeatable benchmark tasks

## Benchmark scoreboard (HN CLI)

Task: minimal read-only Hacker News CLI (`hn top --limit N`).

| Date | Language | Score | Notes |
|---|---|---:|---|
| 2026-03-18 | Go | [97](benchmarks/results/2026-03-18-api-cli-go.md) | `go test` + `go vet` + live smoke pass |
| 2026-03-18 | Rust | [96](benchmarks/results/2026-03-18-api-cli-rust.md) | `cargo fmt --check` + `cargo test` + live smoke pass |

## Status

Experimental, but already usable.
