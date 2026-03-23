# Planforge

![GitHub last commit](https://img.shields.io/github/last-commit/javiermolinar/planforge?style=flat-square)
![Pi package](https://img.shields.io/badge/pi-package-6b8afd?style=flat-square)
![Development mode](https://img.shields.io/badge/development-heavy%20%7C%20may%20break%20any%20time-d97706?style=flat-square)
[![CI](https://github.com/javiermolinar/planforge/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/javiermolinar/planforge/actions/workflows/ci.yml)
[![CI passed](https://img.shields.io/github/actions/workflow/status/javiermolinar/planforge/ci.yml?branch=main&style=flat-square&label=ci%20passed)](https://github.com/javiermolinar/planforge/actions/workflows/ci.yml)
![Docs](https://img.shields.io/badge/docs-flow%20%7C%20pi%20%7C%20tooling-5c677d?style=flat-square)

![Planforge](./forge.png)

Planforge is an opinionated workflow for the **Pi agent harness**.

It optimizes for long-term software quality over short-term momentum: plan first, challenge unnecessary complexity, verify claims honestly, and require explicit acceptance before advancing.

If you want a looser flow, prompt directly. If you want the harness to stay disciplined, use Planforge.

Start with the philosophy: [`docs/philosophy.md`](docs/philosophy.md)

## Quickstart

Global install from git:

```bash
pi install git:github.com/javiermolinar/planforge
```

Run Planforge:

```text
/skill:planforge Build a small read-only Hacker News CLI. Keep it minimal, plan first, and challenge unnecessary complexity.
```

Approve the first mutating scope with `/pf`.

## Workflow in one minute

Planforge has one public entrypoint:

- `/skill:planforge`

In practice, Planforge should:
1. clarify scope
2. investigate only as much as needed
3. produce a compact approval-ready plan packet
4. request approval before mutation
5. execute in bounded checkpoints
6. report verified vs unverified honestly
7. wait for explicit user acceptance before advancing

If extra detail would help, Planforge should suggest short optional follow-ups instead of front-loading more ceremony.

## Canonical docs

- Philosophy: [`docs/philosophy.md`](docs/philosophy.md)
- Workflow: [`docs/flow.md`](docs/flow.md)
- Pi usage: [`docs/pi.md`](docs/pi.md)
- Planning packet: [`docs/plan-packet.md`](docs/plan-packet.md)
- Tooling: [`docs/tooling.md`](docs/tooling.md)
- Machine contract: [`AGENTS.md`](AGENTS.md)

## Rolling plans

Planforge keeps a lightweight rolling plan per branch under `~/.planforge/` by default.

When work ships, `plan-ship` can mark the plan as `shipped` and append a compact shipment footer.

To override the state location:

```bash
export PLANFORGE_HOME=/some/other/location
```

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
