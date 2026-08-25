---
name: forge-review
description: Review a GitHub pull request or local Git diff against its intended functionality, repository obligations, and verification evidence without modifying the repository. Use only when the user explicitly requests a change review.
disable-model-invocation: true
---

# Forge Review

Forge Review is the independent change-review skill in the Planforge engineering suite.

Before starting, read and follow:

- `../../docs/philosophy.md`
- `../../docs/core.md`

## Contract

- Remain repository-read-only for the entire run. Do not edit files, change branches or refs, install dependencies, create commits, or submit a GitHub review.
- Prefer a fresh session. Treat prior conversation and implementation claims as leads, not evidence.
- Apply the same evidence standard regardless of author seniority, familiarity, or AI involvement.
- Pin the exact review target before judging it. If the target changes during review, return **blocked** because the evidence is stale.
- Review intended functionality before code quality. The diff is the target, but relevant callers, data paths, tests, and documentation are evidence.
- Support every finding with a requirement, repository rule, concrete behavior path, or verification result.
- Cite a readily available same-repository precedent when it clarifies a finding or suggestion. Do not search broadly for one or require the same implementation unless a repository contract does.
- Report a few material findings. Omit weak style preferences and issues that predate the change unless the change worsens them.
- If the target is too broad for a complete review, return **blocked** and propose behavior-aligned slices. Do not sample part of it and recommend approval.
- Do not implement fixes. Describe the required outcome or optional improvement.

## Modes

Infer the mode from the request. A GitHub pull request URL selects PR mode; otherwise use local diff mode.

### PR mode

A supplied PR URL authorizes read-only GitHub requests for that PR.

1. Confirm the PR belongs to the current repository. Otherwise return **blocked** and request the matching repository context. If `gh` access is unavailable, return **blocked** rather than installing tools or changing authentication.
2. Use `gh` read-only commands to inspect the PR title, body, base and head SHAs, commits, changed files, linked issues, diff, and check results.
3. Record the base SHA and head SHA as the target identity.
4. Inspect surrounding source from local Git objects when available, otherwise through read-only GitHub API responses. Do not fetch, checkout, or write refs.
5. At the end, read the PR head SHA again. If it changed, return **blocked** and do not present the earlier findings as current.

Do not comment, approve, request changes, merge, label, or otherwise mutate GitHub state.

### Diff mode

1. Use a baseline supplied by the user when present and confirm that it resolves.
2. Otherwise infer the local default-branch merge base from existing refs. If no credible default exists, use `HEAD` only for a dirty working tree; ask when multiple materially different baselines remain plausible.
3. Review all changes from the baseline through the current worktree, including committed, staged, unstaged, and untracked files.
4. Record the baseline, `HEAD`, status, untracked paths, and a read-only content hash as the target identity.
5. Fail clearly on an invalid baseline or empty target.
6. Recompute the identity at the end. If it changed, return **blocked**.

Do not silently review only unstaged hunks when the branch also contains relevant commits.

## 1. Establish intended functionality

Find the sources that own the intended behavior, in this order:

1. task, spec, or acceptance criteria explicitly supplied by the user
2. linked issue or local specification
3. PR body
4. branch and commit messages

Use baseline tests and public documentation to establish existing behavior and compatibility obligations. Changed tests and documentation are implementation evidence; they do not by themselves establish the intended new behavior because they may encode the same mistake as the change.

Extract the material behaviors, public contracts, non-goals, and acceptance conditions. If sources conflict, add a decision under **Decisions Needed** rather than choosing silently.

If no source establishes intent after the automatic search, ask once. If the user confirms that none exists, continue with a partial correctness and risk review but return **blocked** for functional approval.

## 2. Review functionality and correctness

For each material intended behavior:

- trace the changed path through relevant callers, interfaces, data ownership, and side effects
- classify coverage as **met**, **partial**, **missing**, **contradicted**, or **unverified**
- check user-visible behavior, errors, compatibility, persistence, external effects, and scope creep
- inspect surrounding code when a diff hunk alone cannot establish behavior

Probe only assumptions that could materially affect correctness or operations, such as nullability, data shape, cardinality, concurrency, or load. Prefer automated behavior evidence, then empirical operational data, then documented invariants. If local evidence cannot resolve a material assumption, state a precise question under **Residual Uncertainty**. Do not convert an unanswered question into a defect without a concrete failure path.

Then look for concrete regressions, invalid assumptions, security or privacy failures, data loss, crashes, and unsafe failure paths. Do not report a hypothetical concern without naming the scenario and code path that make it possible.

## 3. Review verification

Map tests and checks back to intended behavior rather than counting test files.

Separate:

- **Reproduced:** narrow checks run by the reviewer and their results
- **Observed:** PR checks or implementation evidence inspected but not rerun
- **Not run:** unavailable, unsafe, expensive, or out-of-scope checks

Run a narrow check only when it needs no installation or new network access and any generated output can be isolated outside the repository and removed. Do not run a full suite automatically.

A test gap is **must-fix** only when material behavior lacks other credible evidence. Tests coupled to implementation details without proving behavior do not close a functional gap.

## 4. Review design and scope

Apply repository instructions and the Planforge philosophy to complexity introduced by the change:

- change amplification and dependency growth
- hidden ownership or control flow
- shallow interfaces or leaked representation details
- weak data ownership or repeated conversion
- speculative abstraction, optimization, or unrelated cleanup

Report design findings only when they create a concrete maintenance, correctness, or verification cost. Do not turn the review into a general architecture audit.

## Finding classification

Every finding has an impact and a disposition.

### Impact

- **blocker:** security, privacy, data loss, irreversible effects, or a fundamentally broken public contract
- **major:** material missing behavior, regression, compatibility break, or verification gap
- **minor:** bounded issue with limited impact

### Must fix before approval

Use **must-fix** when evidence shows:

- intended functionality is partial, missing, or contradicted
- public behavior or compatibility regresses
- correctness, security, privacy, or data integrity is at risk
- a required repository obligation or required check is violated
- material behavior lacks credible verification
- the change introduces an unapproved external effect or scope expansion

A must-fix finding must cite the violated requirement, invariant, repository rule, or concrete failure path. Before assigning **must-fix**, name the concrete harm, material verification gap, or violated obligation that justifies merge delay and re-review. If deferral would not create material harm, leave material behavior unverified, or violate an obligation, classify the item **optional** or omit it.

### Optional

Use **optional** when required functionality remains correct and the change is a concrete, local improvement to naming, cohesion, test clarity, or maintainability. Deferring it must not create a material regression.

Omit speculative architecture and weak style preferences instead of padding the optional section.

### Decision needed

When a concern depends on unresolved product intent, place it under **Decisions Needed**. The reviewer does not convert a product decision into a defect.

## Recommendation rules

Apply these in order:

1. **blocked:** target identity changed, intended functionality is unavailable or contradictory, or evidence is insufficient for a responsible verdict
2. **revise:** one or more must-fix findings remain
3. **approve:** only optional findings remain, or no material findings exist

Approval is an evidence-based recommendation, not a guarantee that no defect exists. The user owns the merge decision.

## Output contract

```md
## Review

**Recommended:** **<recommendation>** — one sentence tied to the evidence.

### Target
- mode, pinned identity, reviewed scope, and intent sources

### Intended Functionality
- material behaviors, public contracts, and non-goals

### Functional Coverage
| Intended behavior | Status | Implementation evidence | Verification evidence |
|---|---|---|---|

### Must Fix Before Approval
#### [blocker | major | minor] Finding title
- **Behavior:** affected requirement or user-visible behavior
- **Location:** path and symbol or diff hunk
- **Evidence:** source that establishes the finding
- **Impact:** concrete failure or risk
- **Required outcome:** what must become true

### Optional Improvements
#### [major | minor] Finding title
- **Location:** path and symbol or diff hunk
- **Evidence:** source that supports the suggestion
- **Benefit:** concrete local improvement
- **Suggested improvement:** what could change

### Decisions Needed
1. unresolved material decision
   **Recommended:** preferred answer and why

### Verification
- **Reproduced:** checks and results
- **Observed:** CI or existing evidence inspected
- **Not run:** checks and reasons

### Design / Scope
- material complexity or scope findings; omit when empty

### Residual Uncertainty
- remaining unknowns or `None`
```

Replace `<recommendation>` with exactly one of **approve**, **revise**, or **blocked**. Write `None` under **Must Fix Before Approval** when empty. Omit **Optional Improvements** and **Decisions Needed** when empty. Keep the report concise, include only material intended behaviors in the coverage table, and order must-fix findings by impact rather than file order.
