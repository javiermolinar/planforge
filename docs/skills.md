# Planforge skills

Planforge is an engineering skill suite built on a shared philosophy and core engine.

For machine-checkable package expectations, see `AGENTS.md`.

## Public skills

| Skill | Invocation | Purpose |
|---|---|---|
| Forge | `/skill:forge` | Take an engineering task through cheap investigation, material decisions, implementation, and verification. |

Forge is user-invoked. It does not activate implicitly for ordinary prompts.

## Shared contract

Every Planforge skill must:

- follow `docs/philosophy.md`
- use the investigation and decision rules in `docs/core.md`
- remain independent of runtime gate state
- expose its own purpose, decision point, and completion evidence

Future review, design, and debugging skills should reuse the core directly rather than invoking Forge or creating another orchestration layer.
