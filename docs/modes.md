# Planforge modes

Planforge currently exposes a single public mode.

For the machine-checkable contract, see `AGENTS.md`.

## Mode behavior table

| Mode id | Start command | Gate execution mode | Scope approval required before mutation | Supervised approvals after scope approval | Typical use |
|---|---|---|---|---|---|
| `planforge` | `/skill:planforge` | `supervised` | Yes | Yes (`/pf` for first mutating scope, then again at review gates or scope changes) | Opinionated delivery work with explicit approval gates |

## Notes

- `docs/philosophy.md` is mandatory.
- Non-trivial work must use the Plan Packet from `docs/plan-packet.md`.
- Planning absorbs investigation.
- Material scope changes invalidate prior approval and require re-planning/re-approval.
