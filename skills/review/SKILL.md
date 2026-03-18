---
name: review
description: Focused fresh-context review skill for correctness, maintainability, and test gaps.
---

# Review

Use this in a fresh context window when work is large enough or risky enough to justify an independent pass.

## Fresh-context contract

- Prefer a different agent or new session so the review is not contaminated by the implementation context.
- Do not rely on the full conversation transcript.
- Review from a clean packet containing only the task summary, approved plan, changed files or diff, and verification evidence.
- Do not trust implementation claims without checking the code and evidence yourself.

## Priorities

- correctness
- regressions
- maintainability
- missing test coverage

## Output

- summary
- findings with severity, location, issue, impact, and fix
- test gaps
- final recommendation: approve or revise

## Guardrails

- Prefer a few strong findings over many weak ones.
- Do not pad with low-value style comments.
- Be concrete and actionable.
