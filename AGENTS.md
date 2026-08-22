# AGENTS

Repository contract for the Planforge engineering skill suite.

## Canonical sources

- Philosophy: `docs/philosophy.md`
- Shared core: `docs/core.md`
- Public skills: `docs/skills.md`

## Suite contract

<!-- SUITE_CONTRACT:BEGIN -->
```json
{
  "version": 4,
  "suite": "planforge",
  "coreFiles": [
    "docs/philosophy.md",
    "docs/core.md"
  ],
  "skills": [
    {
      "id": "forge",
      "startCommand": "/skill:forge",
      "skillFile": "skills/forge/SKILL.md",
      "userInvoked": true,
      "readOnlyUntilDecision": true,
      "decisionOptions": [
        "implement",
        "revise",
        "split",
        "stop"
      ]
    }
  ]
}
```
<!-- SUITE_CONTRACT:END -->

## Human summary

| Skill | Start command | Behavior |
|---|---|---|
| `forge` | `/skill:forge` | Investigate cheaply, resolve material decisions, present a sized summary, then implement only when the user chooses it. |

Planforge has no runtime approval extension, special approval command, or persistent workflow state.
