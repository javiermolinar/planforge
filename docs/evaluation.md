# Planforge evaluation

Planforge is a claim about process quality, not just output generation. This document defines how to score a Planforge run in a way that is repeatable enough to compare changes over time.

## Goals

The evaluation should answer:
- Did Planforge follow its own workflow?
- Did it produce a working result?
- Did it verify claims honestly?
- Did it avoid obvious overengineering?
- Is the final code simple and maintainable?

## Scoring model

Use a 100-point score.

### 1. Process compliance — 40 points

Score whether the harness followed the expected workflow.

- Plan before implementation — 8
- Approval respected before coding — 4
- Correct branch behavior — 8
- Rolling plan created — 6
- Tasks checklist present — 4
- Test table present — 4
- Verification at key steps — 6

### 2. Outcome quality — 40 points

Score whether the result actually works and stays lean.

- Result works for the benchmark task — 15
- Expected files and outputs are correct — 10
- No major review findings — 10
- No obvious unnecessary complexity — 5

### 3. Judgment rubric — 20 points

Score the parts that still need human judgment.

- Scope control — 5
- Simplicity — 5
- Transparency — 5
- Maintainability — 5

## Penalties

Apply penalties for behavior that violates the core contract.

- Wrote code before planning: -15
- Claimed success without fresh verification: -20
- Stayed on `main` for non-trivial implementation without challenge: -10
- Introduced obvious overengineering: -10
- Final code fails basic smoke test: -30

Penalties can reduce the final score below 0 if the run is especially poor.

## Secondary metrics

Track these but do not let them dominate the main score:
- elapsed time
- token usage
- number of tool calls
- number of files touched
- number of retries / failed commands

These are useful for trend analysis, not as the primary quality metric.

## Benchmark task categories

Use a small fixed set of benchmark tasks so runs remain comparable.

- Small feature
- Bug fix
- Investigation-only task
- Refactor task
- External API integration task

## Evidence expectations

A score should be backed by evidence from:
- transcript behavior
- git state
- rolling plan contents
- produced files and diffs
- command output
- final review notes

## How to use this

1. Pick a benchmark task.
2. Run it with Planforge.
3. If you want a durable record, copy `docs/scorecard-template.md` into `benchmarks/results/<date>-<task>.md` in the benchmark repository.
4. Fill out the scorecard template.
5. Record hard evidence for each score.
6. Add enhancement ideas for the harness itself.

## Review expectation

For benchmark runs, prefer an independent fresh-context review before assigning the final score. The reviewer should inspect the code and verification evidence without inheriting the implementation session's assumptions.

## Philosophy

This score is not a claim of perfect objectivity. It is a practical way to make regressions visible and to compare harness behavior across changes. Use the same tasks, scoring model, and evidence standard over time.
