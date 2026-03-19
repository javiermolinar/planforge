# Planforge modes

This document is the human-facing mode matrix.

For machine-checkable mode contracts used in regression tests, see `AGENTS.md`.

## Mode behavior table

| Mode id | Start command | Gate execution mode | Scope approval required before mutation | Checkpoint approvals | Typical use |
|---|---|---|---|---|---|
| `planforge` | `/skill:planforge` | `supervised` | Yes | Yes (`/pf-continue` per mutating checkpoint) | Higher-risk or high-confidence delivery work |
| `planforge-fast` | `/skill:planforge-fast` | `fast` | Yes | No (unsupervised after scope approval) | Faster iteration with lighter operator overhead |
| `forge-investigate` | `/skill:forge-investigate` | `none` | N/A (investigation is read-only) | No | Discovery, codebase understanding, risk surfacing |

## Shared expectations

- `docs/philosophy.md` is mandatory across modes.
- Non-trivial work in `planforge` and `planforge-fast` must use the Plan Packet from `docs/plan-packet.md`.
- Scope changes invalidate prior approval and require re-planning/re-approval.
