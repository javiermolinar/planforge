# Planforge skills

Planforge is an engineering skill suite built on a shared philosophy and core engine.

For machine-checkable package expectations, see `AGENTS.md`.

## Public skills

| Skill | Invocation | Purpose |
|---|---|---|
| Forge | `/skill:forge` | Take an engineering task through cheap investigation, material decisions, implementation, and verification. |
| Forge Investigate | `/skill:forge-investigate` | Answer a bounded repository question from local evidence without modifying the repository. |

Both skills are user-invoked. They do not activate implicitly for ordinary prompts. Forge Investigate remains read-only for its entire run.

## Shared contract

Every Planforge skill must:

- follow `docs/philosophy.md`
- use the investigation and applicable decision rules in `docs/core.md`
- remain independent of runtime gate state
- expose its own purpose, stopping point, and completion evidence

Future review, design, and debugging skills should reuse the core directly rather than invoking Forge or creating another orchestration layer.
