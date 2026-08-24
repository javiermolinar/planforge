# Planforge on Pi

## Install

Global install from git:

```bash
pi install git:github.com/javiermolinar/planforge
```

Or install a local checkout while developing:

```bash
pi install /absolute/path/to/planforge
```

Git sources are cached clones managed by Pi. Install by local path when Pi should use an existing checkout directly.

## Use

Start delivery work with Forge:

```text
/skill:forge <engineering task>
```

Start a read-only repository investigation with Forge Investigate:

```text
/skill:forge-investigate <bounded repository question>
```

Review a GitHub pull request or local diff with Forge Review:

```text
/skill:forge-review <pull request URL>
/skill:forge-review Review the current branch diff.
```

Pi exposes skill commands as `/skill:<name>`. Planforge does not register plain `/forge`, `/forge-investigate`, or `/forge-review` aliases.

Forge is user-invoked and follows this sequence:

1. cheap automatic investigation
2. material clarification when needed
3. a sized decision summary
4. an ordinary-language user decision
5. scoped implementation and verification

Forge Investigate is also user-invoked. It stays read-only, traces the repository path that owns the answer, cites local evidence, and stops without implementation.

Forge Review is user-invoked and read-only. It pins either a PR or local diff, reviews intended functionality before code quality, categorizes mandatory and optional findings, and recommends approve, revise, or blocked.

There is no runtime approval extension, special approval command, status overlay, or persistent gate state. Read-only behavior is an instruction-level contract.

## Repository instructions

Pi loads `AGENTS.md` or `CLAUDE.md` from the current directory and its ancestors. It does not recursively load instructions from every descendant directory.

Planforge skills therefore map nested `AGENTS.md`, `AGENTS.override.md`, and `CLAUDE.md` files during investigation and read the ones applicable to the investigated or likely change paths.

## Package shape

Planforge ships skills under `skills/`. Shared behavior lives in `docs/philosophy.md` and `docs/core.md`, which public skills load explicitly.

Use standard Pi package commands:

- `pi list`
- `pi config`
- `pi update --extensions`
