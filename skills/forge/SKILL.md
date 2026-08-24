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
- Treat unspecified public names and invocation commands as material interface decisions when multiple plausible choices exist.
- Treat replacement of a working implementation as a strategy that needs a concrete outcome or constraint, not as self-justifying scope.
- Do not research downstream dependencies, alternate toolchains, or detailed verification setup before the user chooses implementation, unless feasibility is needed for the current recommendation.
- Promise verification only when cheap evidence shows it can run inside the proposed scope.
- Give one explicit recommended decision in every decision summary.
- Do not mutate the repository until the user chooses implementation from a decision summary.
- Accept ordinary language such as `implement`, `go ahead`, or an unambiguous equivalent. Do not require a special command.
- Once implementation starts, continue through the agreed scope without review gates.
- Pause only for material drift, a failed assumption, newly required destructive or external action, or substantially underestimated work.
- Finish with verified versus unverified evidence.

## Flow

### 1. Investigate

Apply the cheap investigation pass from `docs/core.md`. Establish current behavior, likely change surface, repository obligations, and a credible verification path.

Do not ask permission to inspect. Do not install dependencies, use the network, run a full suite, or execute commands expected to change the working tree during this pass. Do not design an alternate implementation or inventory its dependency and toolchain details before the user chooses implementation, unless feasibility determines the current recommendation.

### 2. Clarify material decisions

If material decisions remain, ask the current decision frontier as a numbered round. Use this shape:

```md
1. **Decision title** — The decision and meaningful options.
   **Recommended:** The preferred answer and why.
```

Questions in one round must not depend on one another. Recompute after the user's answers. Let the user reply by number or accept all recommended defaults.

Before a question round, state only the repository findings needed to understand those decisions. Public commands, routes, flags, package names, and other compatibility-bearing identifiers belong on the frontier when the user has not already chosen them. Internal names usually do not.

A request to replace a working implementation specifies a strategy, not why its replacement cost is justified. If no concrete outcome or constraint is supplied, recommend **revise** to establish one. If the stated benefit lacks evidence, recommend **revise** or **stop** and name the cheapest evidence that could change the recommendation. Once the user makes an informed choice after those costs and alternatives are visible, honor it without repeated pushback.

If no material questions remain, skip directly to the decision summary.

### 3. Present the decision summary

Use this compact structure:

```md
## Decision Summary

### Outcome
- goal, included scope, and explicit non-goals

### Evidence
- current behavior and relevant source paths

### Proposed Change
- approach, important boundaries, likely files, and repository obligations

### Size / Risks
- Small, Medium, or Large with the main reasons
- material risks or unknowns only

### Verification
- checks that will be run and their expected evidence
- blocked or optional checks with a reason, only when they materially limit confidence

### Slices
- include only for Large work

**Recommended:** **<decision>** — one sentence tied to the evidence above.

Choose: **implement**, **revise**, **split**, or **stop**.
```

Keep the five main sections short. Omit empty risk and blocked-check bullets, and omit Slices unless the work is Large. Replace `<decision>` with exactly one of **implement**, **revise**, **split**, or **stop**. Do not estimate elapsed time or promise checks that need unavailable setup, access, credentials, or an unapproved external effect. Large work receives a split recommendation but remains the user's decision.

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
