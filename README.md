# Planforge

![Planforge](./forge.png)

Planforge is a lightweight, harness-agnostic workflow for coding agents.

It favors:
- short, explicit planning before implementation
- firm pushback against unnecessary complexity
- single-agent execution by default
- best-effort verification
- lightweight rolling branch plans instead of heavyweight specs

## What it includes

- `skills/` — orchestrator and focused support skills
- `scripts/` — tiny shell helpers for rolling plan files
- `templates/` — rolling plan template
- `docs/` — workflow notes

## Core flow

1. Understand the task
2. Clarify and challenge
3. Produce a short plan in chat
4. Get approval
5. Create a branch if needed
6. Create a rolling branch plan
7. Implement in small tasks
8. Verify best-effort
9. Suggest commits / squash points

## Rolling plans

Planforge stores one rolling plan per branch at:

```text
~/.planforge/plans/<repo-slug>/<branch-slug>.md
```

The first plan is created automatically after plan approval. Later updates are suggested, not silent.

## Install

### Pi (recommended)

Planforge is a valid Pi package.

For a project-local install:

```bash
pi install git:github.com/javiermolinar/planforge -l
```

Or from a local checkout:

```bash
pi install /absolute/path/to/planforge -l
```

If you prefer a global install, drop `-l`.

Pi will discover the skills from `skills/` automatically. The shell helpers stay inside the package repo and Pi-loaded skills can refer to them with relative paths such as `../../scripts/plan-init`.

### Other harnesses

Planforge does not ship an installer in v1.

1. Clone the repo
2. Symlink the skills you want into your harness skill directory
3. Add `scripts/` to your `PATH`

Example:

```bash
git clone <repo-url> ~/src/planforge
export PATH="$HOME/src/planforge/scripts:$PATH"
```

Then symlink the skills you want, for example:

```bash
ln -s ~/src/planforge/skills/orchestrator ~/.config/your-harness/skills/planforge-orchestrator
ln -s ~/src/planforge/skills/investigation ~/.config/your-harness/skills/planforge-investigation
```

## Scripts

- `plan-context` — print repo / branch / plan-path context
- `plan-init` — create the rolling plan if missing
- `plan-set-section` — replace a managed section from stdin
- `plan-append-item` — append a backlog item or checkpoint
- `plan-list` — list saved rolling plans for discoverability
- `plan-branch-name` — generate semantic branch names such as `feat/hn-top-cli`
- `scorecard-init` — create an optional benchmark scorecard file under `benchmarks/results/`

## Semantic conventions

Planforge uses a light semantic naming convention.

### Branches

```text
feat/<slug>
fix/<slug>
refactor/<slug>
docs/<slug>
chore/<slug>
test/<slug>
```

### Commits

```text
feat: add rolling plan helper
fix: handle missing branch context
refactor: tighten orchestrator routing
```

The orchestrator should infer the type when it is obvious and ask when it is ambiguous.

## Verify the shell helpers

```bash
./tests/test-plan-scripts.sh
```

## Pi usage

After installing in Pi, start with:

```text
/skill:orchestrator
/skill:investigation
```

- Use `/skill:orchestrator` for normal feature or change requests
- Use `/skill:investigation` when the first task is understanding the current code or deciding whether something is bloated
- For networked or external-API work, Planforge should suggest a fresh-context review pass before final completion

See `docs/pi.md` for Pi-specific notes.

For benchmark runs and external API work, Planforge should prefer a fresh-context review handoff before final completion claims.

## Starting points

- Use `orchestrator` for normal feature or change requests
- Use `investigation` when the first task is understanding the current code or deciding whether something is bloated

## Status

This is an early skeleton focused on clear boundaries, token economy, and portability.
