# Plan Packet (canonical template)

Use this as the single source of truth for planning output across Planforge skills.

## How to use

- Always follow `docs/philosophy.md` when filling this packet.
- Keep content concise but complete.
- Do not request mutation/implementation approval until all required sections for the current scope are present.
- If scope changes, re-issue the packet (at least updated Plan Summary + Test Table + Harness Check).
- Extract repo obligations up front from local evidence such as `AGENTS.md`, contributing docs, build files, and obvious generated-artifact workflows.

## Required sections (all scopes)

```md
## Plan Summary
- What I will do:
- What I will not do:
- Step order (1..N):

## File Touch Map
| Path | Action (create/modify/test/docs) | Responsibility | Interface/contract impact |
|---|---|---|---|

## Assumptions
| Assumption | Category | Evidence | Risk if wrong | Validation plan | Status |
|---|---|---|---|---|---|

## Architecture Justification
| Decision area | Options considered | Chosen option | Why this choice now | Impact |
|---|---|---|---|---|

## Tradeoff Highlights
| Tradeoff | Option favored | Benefit | Cost | Why acceptable now |
|---|---|---|---|---|

## Architecture/Tradeoff Quality Rubric
| Check | Pass/Fail | Evidence |
|---|---|---|
| Architectural boundaries are explicit |  |  |
| Data flow is explicit across touched components |  |  |
| Error-handling at boundaries is explicit |  |  |
| At least two alternatives considered for major decisions |  |  |
| Tradeoffs include benefits and costs |  |  |
| Time-horizon rationale is explicit (why now) |  |  |
| Red-flag exposure mapped to mitigation |  |  |

## Implementation Step Ledger
| Step ID | Goal | Planned evidence | User acceptance check | Status | Notes |
|---|---|---|---|---|---|

## Repo Obligations
| Obligation | Source | Trigger | Planned handling | Status |
|---|---|---|---|---|

## Test Table
| Scenario | Test command/check | Expected result | Evidence |
|---|---|---|---|

## Baseline Verification Exceptions
| Item | Category (baseline/new/unverified) | Evidence | Planned handling | Status |
|---|---|---|---|---|

## Generated Artifacts Policy
| Artifact/file class | Generation source | Decision (include/isolate/exclude/investigate) | Rationale |
|---|---|---|---|

## Closeout Scope
- Allowed trailing operations:
- Allowed file classes / paths:
- Invalidates closeout lane if:
- Final closeout evidence to report:

## Proposed Review Gates
| Gate ID | Trigger | Required evidence | Why this gate |
|---|---|---|---|

Rules:
- Propose 1-3 review gates for the current scope.
- Prefer meaningful review boundaries over per-command approvals.
- Human may accept, remove, merge, or edit gates before mutation approval.
- If closeout work is predictable (docs regen, mandated verification, commit, push, PR drafting), declare it here instead of forcing an implicit follow-up re-plan.

## Red Flags / Broken Windows
- Relevant red flags from `docs/philosophy.md`:
- One local cleanup now OR explicit follow-up log:

### Broken Windows Table (if applicable)
| Location | Broken window | Severity | Decision (fix-now/log) | Rationale | Follow-up |
|---|---|---|---|---|---|

## Complexity and Risk Snapshot
| Metric | Value | Method | Notes |
|---|---:|---|---|
| Complexity score (0-10) |  | philosophy dimensions |  |
| Risk score (0-10) |  | operational factors |  |

## Tactical vs Strategic Split
- Tactical (~80%):
- Strategic (~20%):

## Dependencies and Unknowns
- Internal/external dependencies and why justified:
- Obscurity/unknowns to make explicit:
- Likely failure modes and planned checks:

## Harness Check
- Philosophy loaded from `docs/philosophy.md`: yes/no
- Principles driving this plan (2-3):
- Current step: <N>/<total>
- Next allowed action: <read-only | mutate after approval>
- Scope approval required now: yes/no
- TDD required for this scope: yes/no

## Next skill handoff
Next skill: <forge-test|forge-implement|forge-investigate|forge-debug|...>
Reason: <one sentence>
```

## Conditional sections

### When complexity >= 6, risk >= 6, or external/networked boundaries are touched

```md
## High-Risk Execution Checks
| Step ID | Command/check | Expected signal | Fallback if mismatch |
|---|---|---|---|
```

Rules:
- Include only high-signal checks for risky steps (target: <= 3 rows).
- Use executable commands/checks with clear expected signals.

### When TDD is required (user request or reproducible bug fix)

```md
## TDD Test Table
| Test | Fails before change | Minimal code change | Pass criteria |
|---|---|---|---|
```

Rules:
- First executable item must be a failing test and command.
- Route to `forge-test` before implementation.
- Do not allow implementation without failing-test evidence.

### When write-path/ingestion is touched

```md
## Write-path semantics
| Dimension | Decision | Notes |
|---|---|---|
| Side effects order |  |  |
| Fail policy (fail-open/fail-closed) |  |  |
| Retry implications |  |  |
| Idempotency expectations |  |  |

## Lifecycle-safety checklist (for new local callbacks/APIs)
- starting behavior
- ready behavior
- stopping behavior
- negative tests: `reject-before-ready`, `reject-during-stopping`

## Negative test matrix
- downstream callback fails
- partial side effects
- service lifecycle transitions
```

## Approval gates

Before asking implementation approval, require:

- Plan Summary + File Touch Map + Assumptions
- Architecture Justification + Tradeoff Highlights
- Architecture/Tradeoff Rubric complete (no unresolved critical fail unless explicitly accepted by user)
- Implementation Step Ledger
- Repo Obligations
- Test Table
- Baseline Verification Exceptions
- Generated Artifacts Policy when generated files or docs workflows are relevant
- Closeout Scope when predictable trailing work exists
- Proposed Review Gates
- Harness Check
- High-Risk Execution Checks when high-risk scope applies
- TDD sections when TDD scope applies
- Write-path sections when write-path scope applies
