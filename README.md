# Planforge

![GitHub last commit](https://img.shields.io/github/last-commit/javiermolinar/planforge?style=flat-square)
![Pi package](https://img.shields.io/badge/pi-package-6b8afd?style=flat-square)
![Status](https://img.shields.io/badge/status-experimental-bf8700?style=flat-square)
![Docs](https://img.shields.io/badge/docs-flow%20%7C%20pi%20%7C%20tooling-5c677d?style=flat-square)

![Planforge](./forge.png)

Planforge is a lightweight, harness-agnostic workflow for coding agents built for serious software development. It favors discipline over vibes: plan first, verify claims, review with fresh eyes, and ship code worthy of Olympus.

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
| Unsupervised (fast) | `/skill:planforge-yolo` | faster iteration with less oversight | Executes without per-action approvals after scope approval |

### Approval gate controls (Pi)

Planforge ships a stateful approval-gate extension that blocks mutating tool calls until explicit approval is active for the current scope.

| Command | Purpose |
|---|---|
| `/pf-gate status` | Show current gate state |
| `/pf-gate on` / `/pf-gate off` | Enable or disable gate for this session |
| `/pf-gate approve` / `/pf-gate revoke` | Manually approve or revoke current scope |
| `/pf-gate scope-changed` | Force re-approval requirement |
| `/pf-gate policy strict` / `balanced` | Set pre-approval bash policy |

Optional default for pre-approval bash policy:

```bash
export PLANFORGE_GATE_BASH_POLICY=strict   # or balanced (default)
```

Use `/skill:forge-investigate` when the first task is discovery (understanding code reality, tracing dependencies, or reducing unknown unknowns) before implementation.

Use `/skill:forge-resume` to continue deferred follow-up plans from the shared next queue.

### Other harnesses

Planforge does not ship an installer for every harness.

Clone the repo, symlink the skills you want into your harness skill directory, and add `scripts/` to your `PATH`.

Example:

```bash
git clone https://github.com/javiermolinar/planforge ~/src/planforge
export PATH="$HOME/src/planforge/scripts:$PATH"
ln -s ~/src/planforge/skills/planforge ~/.config/your-harness/skills/planforge
ln -s ~/src/planforge/skills/planforge-yolo ~/.config/your-harness/skills/planforge-yolo
ln -s ~/src/planforge/skills/forge-investigate ~/.config/your-harness/skills/forge-investigate
```

## Rolling plans

Planforge keeps one rolling plan per working branch. It is created after plan approval and updated at meaningful checkpoints so work stays resumable without turning into a heavyweight spec system.

When work ships, `plan-ship` can mark the plan as `shipped` and append a compact shipment footer (token usage + explicit end line).

By default, Planforge stores state under `~/.planforge/`. To override that location, set `PLANFORGE_HOME`.

## Learn more

- `docs/pi.md` — Pi-specific install and usage notes
- `docs/flow.md` — workflow, branch policy, semantic conventions, and review handoff
- `docs/philosophy.md` — design philosophy, deep modules, and red flags
- `docs/tooling.md` — helper scripts, rolling-plan commands, and smoke checks
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
