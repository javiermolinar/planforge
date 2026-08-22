---
name: forge
description: Take an engineering task from investigation through a user decision to scoped implementation and verification.
disable-model-invocation: true
---

# Forge

Forge is the delivery skill in the Planforge engineering suite.

Before starting, read and follow:

- `../../docs/philosophy.md`
- `../../docs/core.md`

## Contract

- Investigate automatically before asking the user repository-answerable questions.
- Keep the initial investigation cheap and read-only.
- Ask only material decisions, in dependency-aware rounds, with a recommendation for each question.
- Do not mutate the repository until the user chooses implementation from a decision summary.
- Accept ordinary language such as `implement`, `go ahead`, or an unambiguous equivalent. Do not require a special command.
- Once implementation starts, continue through the agreed scope without review gates.
- Pause only for material drift, a failed assumption, newly required destructive or external action, or substantially underestimated work.
- Finish with verified versus unverified evidence.

## Flow

### 1. Investigate

Apply the cheap investigation pass from `docs/core.md`. Establish current behavior, likely change surface, repository obligations, and a credible verification path.

Do not ask permission to inspect. Do not install dependencies, use the network, run a full suite, or execute commands expected to change the working tree during this pass.

### 2. Clarify material decisions

If material decisions remain, ask the current decision frontier as a numbered round. Use this shape:

```md
1. **Decision title** — The decision and meaningful options.
   **Recommended:** The preferred answer and why.
```

Questions in one round must not depend on one another. Recompute after the user's answers. Let the user reply by number or accept all recommended defaults.

Before a question round, state only the repository findings needed to understand those decisions. If no material questions remain, skip directly to the decision summary.

### 3. Present the decision summary

Use this compact structure:

```md
## Decision Summary

### Goal
- intended outcome

### Current Behavior / Evidence
- relevant repository facts and source paths

### Scope
- included work
- explicit non-goals

### Approach
- implementation outline and important boundaries

### Likely Change Surface
- files, modules, interfaces, and repository obligations

### Change Size
- Small, Medium, or Large, with the main reasons

### Risks / Unknowns
- only material items; omit when empty

### Verification
- concrete checks and expected evidence

### Suggested Slices
- include only for Large work

Choose: **implement**, **revise**, **split**, or **stop**.
```

Do not estimate elapsed time. Large work receives a split recommendation but remains the user's decision.

### 4. Follow the user's decision

- **Implement:** perform the agreed work and verification.
- **Revise:** update the investigation, decisions, or summary without mutation.
- **Split:** propose independently verifiable slices and ask which slice to take.
- **Stop:** make no changes.

### 5. Implement and verify

Keep changes inside the agreed scope and prefer the simplest acceptable implementation. Use targeted checks while working, then run the verification promised in the summary.

Do not introduce approval checkpoints. Return to the user only for one of the pause conditions in the contract.

### 6. Report

End with:

```md
## Result
- what changed

## Verified
- commands or checks and their outcomes

## Unverified / Remaining Uncertainty
- checks not run, residual risk, or `None`
```
