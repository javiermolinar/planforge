# Planforge

![GitHub last commit](https://img.shields.io/github/last-commit/javiermolinar/planforge?style=flat-square)
![Pi package](https://img.shields.io/badge/pi-package-6b8afd?style=flat-square)
![Development mode](https://img.shields.io/badge/development-heavy%20%7C%20may%20break%20any%20time-d97706?style=flat-square)
[![CI](https://github.com/javiermolinar/planforge/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/javiermolinar/planforge/actions/workflows/ci.yml)
[![CI passed](https://img.shields.io/github/actions/workflow/status/javiermolinar/planforge/ci.yml?branch=main&style=flat-square&label=ci%20passed)](https://github.com/javiermolinar/planforge/actions/workflows/ci.yml)
![Docs](https://img.shields.io/badge/docs-flow%20%7C%20pi%20%7C%20tooling-5c677d?style=flat-square)

![Planforge](./forge.png)

Planforge is a lightweight workflow for the **Pi agent harness** built for serious software development. It favors discipline over vibes: plan first, verify claims, review with fresh eyes, and ship code worthy of Olympus.

Planforge is for developers who want agents to act less like autocomplete with delusions of grandeur and more like seasoned engineers who can survive review.

It favors:
- short, explicit planning before implementation
- firm pushback against unnecessary complexity
- single-agent execution by default
- best-effort verification with honest reporting
- fresh-context review for riskier work
- lightweight rolling plans instead of heavyweight specs

Check its philosophy: [`docs/philosophy.md`](docs/philosophy.md)

Operational references:
- modes: [`docs/modes.md`](docs/modes.md)
- plan packet: [`docs/plan-packet.md`](docs/plan-packet.md)
- integration tests: [`docs/integration-tests.md`](docs/integration-tests.md)

## Zen of Planforge

1. Compose small interfaces, keep modules deep.
2. Be explicit: surface contracts, dependencies, and unknowns.
3. Prefer one obvious path over clever alternatives.
4. Fail loudly, verify claims, and never hide ambiguity.
5. Ship tactically, improve strategically.

This is baked from years of real engineering tradeoffs, and from hard-won lessons shared by people like **Rob Pike, Ken Thompson, Brian Kernighan, John Ousterhout, and Rich Hickey**.

> “Simplicity is prerequisite for reliability.” — Edsger W. Dijkstra

## Why it feels different

Most agent workflows worship momentum. Planforge serves judgment.

It would rather slow the hand than ship the wrong thing quickly. It pushes back when the plan grows bloated, cuts away ornamental complexity, and treats verification as steel, not smoke. When the work turns risky, it calls for fresh eyes instead of crowning the builder with a hollow victory speech.

Planforge does not kneel before permission theater. Its gate is not a tollbooth for keystrokes; it is a forge strike. A review anvil. A place where a human can narrow scope, reject drift, break bad design before it hardens, and demand proof before the next blow falls. The purpose is not to reduce mutations for their own sake. The purpose is to forge code that deserves to survive contact with reality.

This is not a temple for vibecoding. It is a forge.

Exploration is welcome. But delivery runs through explicit checkpoints, hard tradeoffs, verification evidence, and human acceptance before advancing. In quiet runs with no pushback, `/skill:planforge-fast` and `/skill:planforge` should often converge to similar code. The true power of supervised mode appears when seasoned judgment enters the fire.

Use `/skill:planforge-fast` for quick exploration and `/skill:planforge` when outcomes must be dependable.

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
6. propose one implementation checkpoint at a time and wait for `/pf`
7. execute bounded work for that checkpoint and verify each meaningful step
8. wait for explicit user acceptance before advancing to the next scenario/checkpoint
9. suggest a fresh-context review before completion

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
| Supervised (default) | `/skill:planforge` | serious/high-risk work | Propose one mutating checkpoint at a time and wait for explicit `/pf` before executing that checkpoint |
| Unsupervised (fast) | `/skill:planforge-fast` | faster iteration with less oversight | Executes without checkpoint approvals after scope approval |

### Supervised approvals (Pi)

Planforge carries a lightweight approval gate extension:

- In `/skill:planforge`, mutating tool calls are blocked until you send `/pf`.
- Before first mutation approval, Planforge expects a `## Proposed Review Gates` section in the plan so humans can push back on review boundaries.
- In supervised flow, `/pf` approves mutation scope and is reused at review gates (instead of per-command approvals).
- If a review gate result is awaiting acceptance, `/pf` records acceptance and can approve the next scope in one step.
- The gate is not a bureaucrat guarding keystrokes; it is a review anvil. Use it to temper scope, break complexity, reject drift, and demand stronger evidence before the next strike.
- In `/skill:planforge-fast`, the gate stays off (unsupervised mode) after explicit plan/scope acceptance.
- In `/skill:forge-investigate`, checkpoint approvals stay off and a read-only guard blocks mutating tools (no `/pf` needed).
- If scope changes after approval, the gate revokes approval and requires `/pf` again.
- Use `/pf benchmark on` to enable stricter benchmark-run guidance (scope discipline + minimum evidence checks), and `/pf benchmark off` to disable it.
- Use `/pf status` to open the right-side status overlay on demand (includes parsed review gates and per-gate status).

Use `/skill:forge-investigate` when the first task is discovery (understanding code reality, tracing dependencies, or reducing unknown unknowns) before implementation.

Use `/skill:forge-resume` to continue deferred follow-up plans from the shared next queue.

### Scope

For now, the forge is built around **Pi**. The docs, extension behavior, and workflow examples assume Pi semantics.

## Rolling plans

Each working branch carries its own rolling plan. It is born after approval and updated at meaningful checkpoints so work stays resumable without collapsing into a bloated spec ritual.

When work ships, `plan-ship` can mark the plan as `shipped` and append a compact shipment footer (token usage + explicit end line).

By default, Planforge stores state under `~/.planforge/`. To override that location, set `PLANFORGE_HOME`.

## Benchmark scoreboard (HN CLI)

Task: minimal read-only Hacker News CLI (`hn top --limit N`).

| Date | Language | Score | Notes |
|---|---|---:|---|
| 2026-03-19 | C | [94](benchmarks/results/2026-03-19-api-cli-c.md) | `make clean && make` + smoke + live API pass |
| 2026-03-18 | Go | [97](benchmarks/results/2026-03-18-api-cli-go.md) | `go test` + `go vet` + live smoke pass |
| 2026-03-18 | Rust | [96](benchmarks/results/2026-03-18-api-cli-rust.md) | `cargo fmt --check` + `cargo test` + live smoke pass |

## Status

Heavy development mode: behavior and interfaces may break at any time.

## License

MIT — see [`LICENSE`](LICENSE).
