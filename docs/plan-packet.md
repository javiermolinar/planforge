# Plan Packet (canonical template)

Use this as the single source of truth for planning output across Planforge skills.

## How to use

- Always follow `docs/philosophy.md` when filling this packet.
- Keep content concise and approval-ready.
- Start with the compact packet below for all non-trivial work.
- Offer optional numbered follow-up detail when it would help, but do not force expanded ceremony for ordinary scopes.
- If scope changes, re-issue the packet with updated plan, files, verify steps, and review gates.
- If the work is materially risky, ambiguous, or crosses tricky boundaries, expand the packet before asking for approval.
- Extract repo obligations up front from local evidence such as `AGENTS.md`, contributing docs, build files, and obvious generated-artifact workflows.
- TDD belongs to implementation, not to the packet. Mention it only as an implementation note when it would materially help.

## Compact default (approval-ready)

Use this by default.

```md
## Plan
- short bullets on the intended change
- step order if useful

## Files
- exact files or likely touch points

## Verify
- concrete checks / commands
- expected result

## Assumptions / Risks
- only include this section when there is something real to say

## Proposed Review Gates
| Gate ID | Trigger | Required evidence | Why this gate |
|---|---|---|---|

Want more detail? Reply with:
1. Architecture
2. Risks / assumptions
3. File touch map
4. Verification details
5. Full expanded plan
```

Rules:
- The compact packet must be enough for approval on normal low-risk work.
- Omit `## Assumptions / Risks` when there are no meaningful assumptions or risks.
- Prefer 1-3 meaningful review gates.
- Prefer a single final gate for small, low-risk work.
- Avoid per-command approvals.

## Expand when needed

Add detail before approval when the task is materially risky, ambiguous, or crosses tricky boundaries.

Useful expansions include:

```md
## Architecture / Tradeoffs
- options considered
- chosen approach
- why this is the simplest acceptable path now

## File Touch Map
| Path | Action | Responsibility | Interface/contract impact |
|---|---|---|---|

## Repo Obligations
| Obligation | Source | Trigger | Planned handling | Status |
|---|---|---|---|---|

## Verification Details
| Scenario | Test command/check | Expected result | Evidence |
|---|---|---|---|

## Baseline Verification Exceptions
| Item | Category (baseline/new/unverified) | Evidence | Planned handling | Status |
|---|---|---|---|---|
```

Only add the sections that materially improve clarity.

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

- compact `Plan` + `Files` + `Verify`
- `Proposed Review Gates`
- any real `Assumptions / Risks` worth surfacing
- expanded sections only when scope/risk actually warrants them
- `High-Risk Execution Checks` when high-risk scope applies
- write-path sections when write-path scope applies
