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
  "version": 5,
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
    },
    {
      "id": "forge-investigate",
      "startCommand": "/skill:forge-investigate",
      "skillFile": "skills/forge-investigate/SKILL.md",
      "userInvoked": true,
      "readOnly": true,
      "output": "investigation-report"
    }
  ]
}
```
<!-- SUITE_CONTRACT:END -->

## Human summary

| Skill | Start command | Behavior |
|---|---|---|
| `forge` | `/skill:forge` | Investigate cheaply, resolve material decisions, present a sized summary, then implement only when the user chooses it. |
| `forge-investigate` | `/skill:forge-investigate` | Answer a bounded repository question from local evidence without modifying the repository. |

Planforge has no runtime approval extension, special approval command, or persistent workflow state. Read-only behavior is enforced by the skill contract rather than a runtime gate.
