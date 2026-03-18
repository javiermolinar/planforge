# Planforge philosophy

Planforge is optimized for long-term software quality, not just short-term velocity.

## Zen of Planforge (5)

1. Compose small interfaces, keep modules deep.
2. Be explicit: surface contracts, dependencies, and unknowns.
3. Prefer one obvious path over clever alternatives.
4. Fail loudly, verify claims, and never hide ambiguity.
5. Ship tactically, improve strategically.

Each principle below uses the same structure:
- **Statement** — the rule
- **Intent** — why it exists
- **Operational rule** — how to apply it in practice
- **Red flags** — signs you are violating it

## 1) Complexity is the enemy

**Statement**
- Reduce change amplification, cognitive load, dependency surface, obscurity, and unknown unknowns.

**Intent**
- Keep future changes cheaper and safer.

**Operational rule**
- In planning and review, assess each complexity dimension with low/medium/high plus one mitigation.

**Red flags**
- behavior spread across too many files
- hidden control flow
- unknown unknowns left unstated

## 2) Compose small interfaces, keep modules deep

**Statement**
- Prefer deep modules over shallow modules.

**Intent**
- Hide implementation complexity behind simple interfaces.

**Operational rule**
- Keep interfaces small relative to the functionality provided.
- Merge shallow wrappers that add indirection but little value.

**Red flags**
- complicated interface with little functionality
- tiny pass-through wrappers everywhere
- callers needing internal implementation knowledge

## 3) Ship tactically, improve strategically

**Statement**
- Use a pragmatic 80/20 tactical-to-strategic split.

**Intent**
- Deliver requested behavior while reducing future complexity.

**Operational rule**
- Tactical (~80%): implement the requested behavior.
- Strategic (~20%): local, high-leverage maintainability improvements.

**Red flags**
- only tactical shipping with no quality improvement
- strategic rewrite that explodes scope

## 4) Broken windows are fixed or logged

**Statement**
- If you touch visible local quality debt, fix one small issue now or log it explicitly.

**Intent**
- Prevent slow quality decay in touched areas.

**Operational rule**
- During planning/implementation, identify one local cleanup opportunity and either:
  - implement it safely now, or
  - record it with a concrete follow-up in backlog/checkpoints.

**Red flags**
- stepping over obvious local debt silently
- repeatedly touching the same messy area without any cleanup or tracking

## 5) Explicitness over guesswork

**Statement**
- Surface contracts, dependencies, and ambiguity explicitly.

**Intent**
- Make behavior understandable and reviewable.

**Operational rule**
- In ambiguous situations, ask or record assumptions; do not guess silently.
- Verification should state what is verified vs unverified.

**Red flags**
- silent assumptions
- vague ownership
- confidence claims without evidence

## 6) Keep it simple

**Statement**
- Prefer simple algorithms and simple structures over cleverness.

**Intent**
- Reduce bugs, cognitive load, and implementation risk.

**Operational rule**
- Start with the simplest implementation that satisfies the requirement.
- Introduce fancier algorithms only when measured evidence justifies them.

**Red flags**
- hard-to-explain algorithmic complexity for small or unknown `n`
- clever implementations that are difficult to test or reason about
- optimization work that increases obscurity without proven benefit

## 7) Data first

**Statement**
- Design the right data abstractions first; let algorithms follow from data shape.

**Intent**
- Improve clarity, reduce change amplification, and make behavior self-evident.

**Operational rule**
- Spend design effort on data ownership, boundaries, and interfaces before algorithmic tuning.
- Prefer interfaces that hide representation details from callers.

**Red flags**
- logic spread across modules compensating for weak data modeling
- caller code depending on internal representation details
- repeated conversions or ad-hoc mappings due to poor abstraction boundaries

## 8) Measure before optimize

**Statement**
- Avoid premature optimization; optimize only with measurement evidence.

**Intent**
- Prevent speculative complexity and focus effort on real bottlenecks.

**Operational rule**
- Do not tune for speed until profiling or measurement identifies a dominant hotspot.
- Keep optimization scope local and verify impact after changes.

**Red flags**
- speed hacks added without benchmark/profiling evidence
- micro-optimizations in non-dominant code paths
- complexity introduced for hypothetical performance concerns

## Linux interface example

The Linux file interface is a good deep-module mental model: a small set of core calls provides access to substantial implementation complexity. The interface remains comparatively simple while complexity is hidden behind it.

## Red flags

Treat these as strict warnings in planning, implementation, and review:

- shallow module decomposition
- one behavior spread across too many places without boundary benefit
- dependency growth without clear leverage
- hidden control flow or unclear ownership
- unknown unknowns left unstated
- silent broken windows in touched areas
- premature optimization without measurement evidence
- fancy algorithmic complexity where simpler code would suffice
- weak data abstractions that leak internals to callers
