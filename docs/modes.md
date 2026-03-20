# Planforge modes

This document is the human-facing mode matrix.

For machine-checkable mode contracts used in regression tests, see `AGENTS.md`.

## Mode behavior table

| Mode id | Start command | Gate execution mode | Scope approval required before mutation | Supervised approvals after scope approval | Typical use |
|---|---|---|---|---|---|
| `planforge` | `/skill:planforge` | `supervised` | Yes | Yes (`/pf` for first mutating scope, then again at review gates or scope changes) | Higher-risk or high-confidence delivery work |
| `planforge-fast` | `/skill:planforge-fast` | `fast` | Yes | No (unsupervised after scope approval) | Faster iteration with lighter operator overhead |
| `forge-investigate` | `/skill:forge-investigate` | `none` | N/A (investigation is read-only) | No | Discovery, codebase understanding, risk surfacing |

## Shared expectations

- `docs/philosophy.md` is mandatory across modes.
- Non-trivial work in `planforge` and `planforge-fast` must use the Plan Packet from `docs/plan-packet.md`.
- Plans should extract repo obligations explicitly and may declare a bounded closeout scope for predictable trailing work.
- Material scope changes invalidate prior approval and require re-planning/re-approval; declared closeout work does not.
