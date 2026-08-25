# Planforge core

This document defines the shared engine for Planforge engineering skills. It is a behavioral contract, not a runtime state machine.

Every public skill must read `docs/philosophy.md` and this document before applying its specialized workflow.

## 1. Discover instructions by scope

Do not assume Pi loaded every repository instruction file. Pi loads context files from the current directory and its ancestors, not every descendant directory.

At the start of repository work:

1. Use already-loaded instructions.
2. Locate repository `AGENTS.md`, `AGENTS.override.md`, and `CLAUDE.md` files with a repository-aware search that excludes dependency, build, cache, and VCS directories.
3. Build a path-to-instructions map.
4. Read root instructions immediately.
5. Read nested instructions when investigation enters that subtree or identifies it as a likely change surface.

Treat nested instructions as scoped to their directory tree. For each directory, use `AGENTS.override.md` when present; otherwise use `AGENTS.md`, then `CLAUDE.md` as the fallback. Do not concatenate every nested file into a global policy.

## 2. Investigate automatically and cheaply

Begin investigation without asking permission. Gather enough evidence to understand the task, not the whole repository.

A normal orientation pass checks:

- repository root, branch, and working-tree state
- top-level structure and relevant manifests
- likely entry points, symbols, and behavior paths
- adjacent tests and documentation
- build, test, generated-artifact, and CI obligations relevant to the task or likely change

Follow the primary behavior path until its relevant interfaces and evidence or verification path are clear. Deepen only when a material conclusion or decision depends on more evidence.

Resolve upstream decisions before investigating downstream implementation details. Do not inspect alternate toolchains, dependency caches, or detailed verification setup while an unsettled decision could make that work irrelevant. Deepen there only when feasibility is the current material decision.

During the automatic pass, do not:

- install dependencies
- use the network
- run full builds or full test suites
- execute commands expected to alter the working tree
- inventory unrelated parts of the repository

A specialized skill may propose a more expensive investigation later when the user needs it.

## 3. Separate facts from decisions

Facts available from files, tools, or existing behavior are the agent's responsibility. Do not ask the user to retrieve them.

A question is material when different answers would change at least one of:

- user-visible behavior or scope
- public interfaces, user-facing identifiers or invocation commands, and compatibility
- data ownership or persistence
- security, external effects, or operational risk
- verification and acceptance criteria

Use a sensible default for reversible implementation details and disclose that default in the skill's output. When the user has not supplied a public name and multiple plausible names would create different user-facing contracts, ask instead of choosing silently.

## 4. Ask the material decision frontier

When the task contains unresolved material decisions, model them as a dependency tree. The frontier contains decisions whose prerequisites are settled.

For Medium and Large changes, ask the current frontier as a numbered round. Each question must include a recommended answer. Do not place two questions in the same round when one answer could change the other question. If no material decisions remain, skip the question round but keep the skill's full decision output.

Prefer one round of three to five questions. Use a second round only when earlier answers reveal new material decisions. This is a soft target, not a reason to hide uncertainty.

After each response, recompute the frontier. Allow short answers by number and allow the user to accept the recommended defaults together.

A mutating skill may replace the separate question round and full decision output with one compact proposal when all of these conditions hold:

- the contemplated change is Small
- one recommended implementation can be stated without hiding meaningful alternatives, material risk, or dependent decisions
- the bounded outcome, relevant evidence, proposed change, accepted choices or defaults, and direct verification path fit in that proposal
- the recommendation is to implement

The proposal must identify the change as Small. An ordinary-language acceptance such as `go` accepts the stated recommendations and authorizes only the described scope. Do not follow that acceptance with another decision summary. If the work is Medium or Large, or a compact proposal would conceal a material choice, use the full decision path.

If the frontier remains broad, recommend splitting the task instead of extending the interview indefinitely. When the task contemplates a repository change, treat that breadth as evidence that the change is Large.

## 5. Know when investigation is ready

Investigation is ready for the skill's output when it can state:

- the bounded question or intended outcome and its non-goals
- current behavior or relevant facts with repository evidence
- important interfaces and boundaries
- applicable repository obligations
- a credible evidence or verification path
- remaining material decisions, unknowns, or explicit assumptions

Promise checks only when cheap evidence supports that they can run within the proposed effects. Do not inspect dependency caches, alternate toolchains, or setup details solely to prove future verification availability. If availability remains uncertain, label it as an assumption or blocked check; deepen only when feasibility determines the current decision.

When the task contemplates a repository change, the skill must also know the likely change surface and a Small, Medium, or Large change size.

If no unresolved material decisions remain, proceed directly to the skill's output.

## 6. Size the change

Size contemplated repository changes, not investigation effort or elapsed time.

- **Small:** one bounded behavior area, known interfaces, low uncertainty, and one direct verification path.
- **Medium:** multiple files or components, a non-trivial interface or behavior choice, or moderate verification cost.
- **Large:** cross-component or public contract changes, migrations, external boundaries, high uncertainty, or multiple independently valuable outcomes.

If no change is contemplated, omit change size. Large is an advisory signal, not a blocker. Recommend independently verifiable slices and let the user choose.

## 7. Control drift without ceremony

For a skill that can mutate the repository, a user's decision authorizes the described scope. Do not add intermediate approval gates. A read-only skill never treats an investigation request as authorization to mutate.

Pause and return to the user only when:

- requested behavior or scope changes materially
- a key assumption proves false
- a destructive, irreversible, privileged, or external action becomes necessary
- the work substantially exceeds the scope or risk described in the authorized compact proposal or decision summary

Ordinary implementation discoveries inside an agreed mutating scope do not require another decision.

## 8. Report evidence honestly

Completion reports must separate:

- findings or changed behavior
- evidence or verification performed and its result
- checks not run
- remaining uncertainty or follow-up work

Read-only skills distinguish facts from inferences. Mutating skills identify what changed. Never turn an unverified expectation into a finding or success claim.
