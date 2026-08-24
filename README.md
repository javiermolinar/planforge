# Planforge

![GitHub last commit](https://img.shields.io/github/last-commit/javiermolinar/planforge?style=flat-square)
![Pi package](https://img.shields.io/badge/pi-package-6b8afd?style=flat-square)
![Development mode](https://img.shields.io/badge/development-heavy%20%7C%20may%20break%20any%20time-d97706?style=flat-square)
![Planforge](./forge.png)

Planforge is a prompt-driven engineering skill suite for the **Pi agent harness**.

It combines a shared software philosophy with a lightweight core: investigate facts cheaply, ask only material decisions, make change size visible, implement the chosen scope, and verify claims honestly.

## Install

Global install from git:

```bash
pi install git:github.com/javiermolinar/planforge
```

Local checkout while developing:

```bash
pi install /absolute/path/to/planforge
```

## Forge

Forge is the delivery skill in the suite:

```text
/skill:forge Build a small read-only Hacker News CLI. Keep it minimal.
```

Forge will:

1. investigate the repository automatically and cheaply
2. separate discoverable facts from user decisions
3. ask dependency-aware material questions, with recommended defaults
4. present a decision summary with Small, Medium, or Large change size
5. let the user choose **implement**, **revise**, **split**, or **stop**
6. implement the agreed scope without intermediate approval gates
7. report verified versus unverified results

Forge remains read-only until the user chooses implementation. Ordinary language is sufficient; there is no special approval command.

## Forge Investigate

Forge Investigate answers a bounded repository question without modifying the repository:

```text
/skill:forge-investigate Trace how configuration flows through this project.
```

It traces the behavior path that owns the answer, supports material conclusions with local repository evidence, separates facts from inferences, and reports unknowns honestly. It does not use the network, create report files, or transition into implementation. Use Forge when the next step includes changes.

## Shared core

Every Planforge skill follows:

- [`docs/philosophy.md`](docs/philosophy.md) — engineering principles
- [`docs/core.md`](docs/core.md) — cheap investigation, material decisions, conditional change sizing, drift, and evidence
- [`docs/skills.md`](docs/skills.md) — public skill catalog

The package intentionally ships no runtime extension or persistent workflow state. Future review, design, and debugging skills will reuse the same core.

## Status

Heavy development mode: behavior and interfaces may break at any time.

## License

MIT — see [`LICENSE`](LICENSE).
