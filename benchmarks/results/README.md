# Benchmark results

This directory is for optional scorecard output files produced during benchmark runs.

Use `scorecard-init <task-slug>` to create an optional scorecard output file for the current repository under `benchmarks/results/`.

Examples:

```bash
scorecard-init api-cli
scorecard-init bugfix
```

These result files are useful when you want a durable record of a run. They are optional by design so Planforge can stay lightweight.

When the root `README.md` scoreboard links to a run, keep the referenced scorecard file here so evidence remains available even if temporary benchmark repos are deleted.
