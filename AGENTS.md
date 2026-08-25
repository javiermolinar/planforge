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
  "version": 7,
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
      "decisionPaths": {
        "Small": "compact-proposal",
        "Medium": "decision-frontier-and-summary",
        "Large": "decision-frontier-and-summary"
      },
      "smallChangeAuthorization": "go-or-unambiguous-equivalent",
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
    },
    {
      "id": "forge-review",
      "startCommand": "/skill:forge-review",
      "skillFile": "skills/forge-review/SKILL.md",
      "userInvoked": true,
      "readOnly": true,
      "modes": [
        "pull-request",
        "diff"
      ],
      "output": "review-report",
      "findingDispositions": [
        "must-fix",
        "optional"
      ],
      "recommendations": [
        "approve",
        "revise",
        "blocked"
      ]
    }
  ]
}
```
<!-- SUITE_CONTRACT:END -->

## Human summary

| Skill | Start command | Behavior |
|---|---|---|
| `forge` | `/skill:forge` | Investigate cheaply, use a compact proposal for Small changes or the full decision flow for Medium and Large changes, then implement only when the user authorizes it. |
| `forge-investigate` | `/skill:forge-investigate` | Answer a bounded repository question from local evidence without modifying the repository. |
| `forge-review` | `/skill:forge-review` | Review a pull request or local diff against intended functionality and verification evidence without modifying it. |

Planforge has no runtime approval extension, special approval command, or persistent workflow state. Read-only behavior is enforced by the skill contract rather than a runtime gate.
