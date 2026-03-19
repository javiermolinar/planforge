# Plan Packet (canonical template)

Use this as the single source of truth for planning output across Planforge skills.

## How to use

- Always follow `docs/philosophy.md` when filling this packet.
- Keep content concise but complete.
- Do not request mutation/implementation approval until all required sections for the current scope are present.
- If scope changes, re-issue the packet (at least updated Plan Summary + Test Table + Harness Check).

## Required sections (all scopes)

```md
## Plan Summary
- What I will do:
- What I will not do:
- Step order (1..N):

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

## Test Table
| Scenario | Test command/check | Expected result | Evidence |
|---|---|---|---|

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

- Plan Summary + Assumptions
- Architecture Justification + Tradeoff Highlights
- Architecture/Tradeoff Rubric complete (no unresolved critical fail unless explicitly accepted by user)
- Implementation Step Ledger
- Test Table
- Harness Check
- TDD sections when TDD scope applies
- Write-path sections when write-path scope applies
