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
- explicit complexity checks: change amplification, cognitive load, dependency surface, obscurity, and unknown unknowns
- a pragmatic 80/20 tactical-to-strategic split and a broken-window mindset in touched areas

## Example

In Pi:

```text
/skill:planforge Build a small read-only Hacker News CLI. Keep it minimal, plan first, and challenge unnecessary complexity.
```

Planforge should then:
1. clarify the scope
2. produce a short plan and test table
3. create a semantic branch if needed
4. create a rolling plan
5. implement in small tasks
6. verify each meaningful step
7. suggest a fresh-context review before completion

## Quickstart

### Pi

Project-local install:

```bash
pi install git:github.com/javiermolinar/planforge -l
```

Or from a local checkout:

```bash
pi install /absolute/path/to/planforge -l
```

Then start with:

```text
/skill:planforge
/skill:forge-investigate
```

### Other harnesses

Planforge does not ship an installer for every harness.

Clone the repo, symlink the skills you want into your harness skill directory, and add `scripts/` to your `PATH`.

Example:

```bash
git clone https://github.com/javiermolinar/planforge ~/src/planforge
export PATH="$HOME/src/planforge/scripts:$PATH"
ln -s ~/src/planforge/skills/planforge ~/.config/your-harness/skills/planforge
ln -s ~/src/planforge/skills/forge-investigate ~/.config/your-harness/skills/forge-investigate
```

## Rolling plans

Planforge keeps one rolling plan per working branch. It is created after plan approval and updated at meaningful checkpoints so work stays resumable without turning into a heavyweight spec system.

By default, Planforge stores state under `~/.planforge/`. To override that location, set `PLANFORGE_HOME`.

## Why it feels different

Most agent workflows optimize for momentum. Planforge optimizes for judgment.

It pushes back when the plan is bloated, prefers small honest steps over dramatic leaps, and treats verification as evidence instead of theater. When the work is risky, it asks for fresh eyes instead of trusting the builder's own victory speech.

This is not a temple for vibecoding. It is a forge.

## Learn more

- `docs/pi.md` — Pi-specific install and usage notes
- `docs/flow.md` — workflow, branch policy, semantic conventions, and review handoff
- `docs/tooling.md` — helper scripts, rolling-plan commands, and smoke checks
- `docs/evaluation.md` — benchmarks and scoring model
- `benchmarks/README.md` — repeatable benchmark tasks

## Status

Experimental, but already usable.
