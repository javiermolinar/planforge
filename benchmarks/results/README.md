# Benchmark results

This directory is for optional scorecard output files produced during benchmark runs.

If you want a durable record for a run, copy `docs/scorecard-template.md` into `benchmarks/results/<date>-<task>.md` and fill it out.

Example:

```bash
cp docs/scorecard-template.md benchmarks/results/$(date +%F)-api-cli.md
```

These result files are useful when you want a durable record of a run. They are optional by design so Planforge can stay lightweight.

When the root `README.md` scoreboard links to a run, keep the referenced scorecard file here so evidence remains available even if temporary benchmark repos are deleted.
