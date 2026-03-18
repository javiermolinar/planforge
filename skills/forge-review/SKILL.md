---
name: forge-review
description: Focused fresh-context review skill for correctness, maintainability, and test gaps.
---

# Review

Use this in a fresh context window when work is large enough or risky enough to justify an independent pass.

## Fresh-context contract

- Prefer a different agent or new session so the review is not contaminated by the implementation context.
- Do not rely on the full conversation transcript.
- Review from a clean packet containing only the task summary, approved plan, changed files or diff, and verification evidence.
- Do not trust implementation claims without checking the code and evidence yourself.

## Mutation safety (strict)

`forge-review` is non-mutating.

- Allowed: `read`, and non-mutating `bash` for inspection (`ls`, `rg`, `find`, `git status`, `git diff`, etc.).
- Prohibited: `edit`, `write`, branch changes, mutating scripts, or mutating shell operations.
- If a fix is obvious, report it as a recommendation; do not implement it in this skill.

## Tool discipline (Pi)

- Use `read` for source file contents.
- Do not use `cat`, `sed`, `awk`, `head`, or `tail` to inspect source files.
- Use `bash` for discovery/diff/status only.

## Priorities

- correctness
- regressions
- maintainability
- missing test coverage
- complexity impact

## Complexity review

Follow the canonical Planforge philosophy in `../../docs/philosophy.md`.
Treat the red flags in `../../docs/philosophy.md` as strict warnings, not optional advice.

Review whether the change increased:

- change amplification
- cognitive load
- dependency surface
- obscurity

Assess deep-vs-shallow module quality using the canonical criteria.

Also review:
- whether the tactical-to-strategic split was reasonable for the task
- whether broken window opportunities were handled (fixed or explicitly logged)

## Review summary

Start with a concise summary of overall risk and recommendation.

## Assumptions challenged table

When assumptions are present, report validation in table form:

| Assumption | Was it validated? | Evidence | Impact if wrong | Action |
|---|---|---|---|---|

## Broken windows found table

If broken windows are found during review, report them in table form:

| Location | Issue | Severity | Immediate fix? | Follow-up |
|---|---|---|---|---|

If broken windows are found, mark each as fixed, deferred, or explicitly accepted with rationale.

If an item is deferred to another session, create a follow-up plan in the shared next queue with:

- `../../scripts/plan-next-init <topic>`

Put the returned path in the `Follow-up` column.

## Metrics snapshot

At the end of the review summary, include:

| Metric | Value | Method | Notes |
|---|---:|---|---|
| Complexity score (0-10) |  | calculated or measured |  |
| Risk score (0-10) |  | calculated |  |

Complexity score (0-10) should use the same five philosophy dimensions (0-2 each):
- change amplification
- cognitive load
- dependency surface
- obscurity
- unknown unknowns

Risk score (0-10) should use five operational factors (0-2 each):
- blast radius
- failure impact
- assumption uncertainty
- external/API dependency risk
- verification/test gap

If Complexity >= 7 and Risk >= 7, include mitigation suggestions before final recommendation.

## Mitigation suggestions (required when both are high)

When both metrics are high, recommend concrete mitigations such as:
- scope split into smaller deliverables
- dependency/interface reduction
- explicit assumption-validation step before further coding
- rollback/containment strategy
- mandatory fresh-context follow-up review
- defer non-essential work into the shared next queue with `../../scripts/plan-next-init <topic>`

## Output

- summary
- findings with severity, location, issue, impact, and fix
- test gaps
- final recommendation: approve or revise
- suggested next skill (`forge-verify`, `forge-test`, or `forge-implement`) with one-line rationale

## Guardrails

- Prefer a few strong findings over many weak ones.
- Do not pad with low-value style comments.
- Be concrete and actionable.
