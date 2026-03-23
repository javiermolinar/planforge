# AGENTS

Repository-level contract for agent behavior, mode expectations, and regression test invariants.

## Canonical sources

- Philosophy (mandatory): `docs/philosophy.md`
- Plan Packet template (mandatory for non-trivial implementation planning): `docs/plan-packet.md`
- Human mode matrix: `docs/modes.md`

## Mode contract (machine-readable)

<!-- MODE_CONTRACT:BEGIN -->
```json
{
  "version": 3,
  "modes": [
    {
      "id": "planforge",
      "startCommand": "/skill:planforge",
      "skillFile": "skills/planforge/SKILL.md",
      "executionMode": "supervised",
      "readOnlyUntilScopeApproval": true,
      "requiresPlanPacket": true,
      "requiresPhilosophy": true,
      "checkpointApprovals": "required"
    }
  ]
}
```
<!-- MODE_CONTRACT:END -->

## Human summary

| Mode | Start command | Execution mode | Expected behavior |
|---|---|---|---|
| `planforge` | `/skill:planforge` | `supervised` | Approval gate on. `/pf` required for the first mutating scope, then again at review gates or scope changes. |

## Regression expectations

Deterministic contract gate:
- `tests/test-mode-contract.sh` must fail if any of the following regress.

Live workflow gate (optional):
- `tests/test-pi-e2e-modes.sh` validates supervised behavior with Pi + LLM on a non-trivial fixture when `PLANFORGE_RUN_PI_E2E=1`.

`tests/test-mode-contract.sh` must fail if any of the following regress:

- `AGENTS.md` machine contract is missing or malformed.
- `docs/modes.md` no longer reflects the mode contract.
- Mode skills stop referencing `docs/philosophy.md` when required.
- Mode skills requiring Plan Packet stop referencing `docs/plan-packet.md`.
- Approval gate extension loses command-to-execution-mode mappings.
