# Planforge benchmarks

This directory defines repeatable benchmark tasks for evaluating Planforge.

## Principles

- Keep tasks small enough to finish quickly.
- Keep tasks realistic enough to expose bad habits.
- Reuse the same tasks over time.
- Score runs with `docs/scorecard-template.md`.

## Benchmark set

- `tasks/small-feature.md`
- `tasks/bugfix.md`
- `tasks/investigation.md`
- `tasks/api-cli.md`

## How to run a benchmark

1. Pick a task definition.
2. Create or choose a repository for the run.
3. Run the task with Planforge.
4. Verify each major step.
5. Fill out the scorecard.
6. Record enhancement ideas for the harness.

## Results

Benchmark result persistence is optional. If you want a durable record for a run, use `scorecard-init <task-slug>` to create an optional scorecard output file under `benchmarks/results/` in the current repository.

## Review guidance

For benchmark runs, prefer a fresh-context review handoff before final scoring. Use a different agent or new session, and pass only the task summary, approved plan, diff or changed files, and verification evidence.

See:
- `benchmarks/results/README.md`
- `benchmarks/backlog.md`
