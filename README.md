# Planforge

![Planforge](./forge.png)

Planforge is a lightweight, harness-agnostic workflow for coding agents built for serious software development. It favors discipline over vibes: plan first, verify claims, review with fresh eyes, and ship code worthy of Olympus.

It favors:
- short, explicit planning before implementation
- firm pushback against unnecessary complexity
- single-agent execution by default
- best-effort verification
- lightweight rolling branch plans instead of heavyweight specs

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

## Rolling plans

Planforge keeps one rolling plan per working branch. It is created after plan approval and updated at meaningful checkpoints so work stays resumable without turning into a heavyweight spec system.

By default, Planforge stores state under `~/.planforge/`. To override that location, set `PLANFORGE_HOME`.

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
ln -s ~/src/planforge/skills/planforge ~/.config/your-harness/skills/planforge
ln -s ~/src/planforge/skills/forge-investigate ~/.config/your-harness/skills/forge-investigate
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
/skill:planforge
/skill:forge-investigate
```

- Use `/skill:planforge` for normal feature or change requests
- Use `/skill:forge-investigate` when the first task is understanding the current code or deciding whether something is bloated
- For networked or external-API work, Planforge should suggest a fresh-context review pass before final completion

See `docs/pi.md` for Pi-specific notes.

For benchmark runs and external API work, Planforge should prefer a fresh-context review handoff before final completion claims.

## Starting points

- Use `planforge` for normal feature or change requests
- Use `forge-investigate` when the first task is understanding the current code or deciding whether something is bloated

## Status

This is an early skeleton focused on clear boundaries, token economy, and portability.
