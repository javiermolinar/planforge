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
- build, test, generated-artifact, and CI obligations relevant to the likely change

Follow the primary behavior path until its interfaces and verification path are clear. Deepen only when a material decision depends on more evidence.

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
- public interfaces or compatibility
- data ownership or persistence
- security, external effects, or operational risk
- verification and acceptance criteria

Use a sensible default for reversible implementation details and disclose that default in the summary.

## 4. Ask the material decision frontier

Model unresolved decisions as a dependency tree. The frontier contains decisions whose prerequisites are settled.

Ask the current frontier as a numbered round. Each question must include a recommended answer. Do not place two questions in the same round when one answer could change the other question.

Prefer one round of three to five questions. Use a second round only when earlier answers reveal new material decisions. This is a soft target, not a reason to hide uncertainty.

After each response, recompute the frontier. Allow short answers by number and allow the user to accept the recommended defaults together.

If the frontier remains broad, treat that as evidence that the work is Large and recommend splitting it instead of extending the interview indefinitely.

## 5. Know when investigation is ready

Investigation is ready for a decision when the skill can state:

- the intended outcome and non-goals
- current behavior with repository evidence
- likely change surface and important boundaries
- applicable repository obligations
- a credible verification path
- remaining material decisions or explicit assumptions
- a Small, Medium, or Large change size

If no material questions remain, proceed directly to the skill's decision output.

## 6. Size the change

Use change size, not time estimates.

- **Small:** one bounded behavior area, known interfaces, low uncertainty, and one direct verification path.
- **Medium:** multiple files or components, a non-trivial interface or behavior choice, or moderate verification cost.
- **Large:** cross-component or public contract changes, migrations, external boundaries, high uncertainty, or multiple independently valuable outcomes.

Large is an advisory signal, not a blocker. Recommend independently verifiable slices and let the user choose.

## 7. Control drift without ceremony

A user's decision authorizes the described scope. Do not add intermediate approval gates.

Pause and return to the user only when:

- requested behavior or scope changes materially
- a key assumption proves false
- a destructive, irreversible, privileged, or external action becomes necessary
- the work is substantially larger or riskier than the decision summary described

Ordinary implementation discoveries inside the agreed scope do not require another decision.

## 8. Report evidence honestly

Completion reports must separate:

- changed behavior
- verification performed and its result
- checks not run
- remaining uncertainty or follow-up work

Never turn an unverified expectation into a success claim.
