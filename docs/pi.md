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

Start Forge with:

```text
/skill:forge <engineering task>
```

Pi exposes skill commands as `/skill:<name>`. Planforge does not register a plain `/forge` alias.

Forge is user-invoked and follows this sequence:

1. cheap automatic investigation
2. material clarification when needed
3. a sized decision summary
4. an ordinary-language user decision
5. scoped implementation and verification

There is no runtime approval extension, special approval command, status overlay, or persistent gate state.

## Repository instructions

Pi loads `AGENTS.md` or `CLAUDE.md` from the current directory and its ancestors. It does not recursively load instructions from every descendant directory.

Forge therefore maps nested `AGENTS.md`, `AGENTS.override.md`, and `CLAUDE.md` files during investigation and reads the ones applicable to likely change paths.

## Package shape

Planforge ships skills under `skills/`. Shared behavior lives in `docs/philosophy.md` and `docs/core.md`, which public skills load explicitly.

Use standard Pi package commands:

- `pi list`
- `pi config`
- `pi update --extensions`
