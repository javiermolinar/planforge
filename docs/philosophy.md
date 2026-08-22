# Planforge philosophy

Planforge optimizes engineering work for long-term software quality without turning discipline into ceremony.

The philosophy applies to every skill in the suite. Skills may specialize the workflow, but they must not weaken these principles.

## 1. Complexity is the enemy

**Statement**

Reduce change amplification, cognitive load, dependency surface, obscurity, and unknown unknowns.

**Operational rule**

Choose the smallest design that satisfies the requirement. Treat additional files, layers, dependencies, and control flow as costs that need evidence.

**Red flags**

- one behavior spread across unrelated places
- hidden ownership or control flow
- new abstractions without current leverage
- uncertainty presented as confidence

## 2. Keep interfaces small and modules deep

**Statement**

Hide substantial behavior behind small, stable interfaces.

**Operational rule**

Prefer cohesive modules over shallow wrappers. Callers should not need representation details or orchestration knowledge.

**Red flags**

- pass-through layers
- callers coupled to internals
- broad interfaces with little functionality
- changes that ripple through many consumers

## 3. Facts before decisions

**Statement**

The agent owns discoverable facts. The user owns material decisions.

**Operational rule**

Investigate the repository before asking questions. Ask the user only when the answer changes scope, behavior, interfaces, risk, or verification and cannot be established from available evidence.

**Red flags**

- asking the user where code lives
- guessing about repository behavior
- silently choosing product behavior
- presenting reversible implementation details as major decisions

## 4. Prefer simple, data-first designs

**Statement**

Shape data ownership and boundaries before reaching for clever algorithms or architecture.

**Operational rule**

Start with the simplest implementation that meets the requirement. Optimize only when measurement identifies a real bottleneck.

**Red flags**

- speculative optimization
- complicated algorithms for unmeasured problems
- repeated conversions caused by weak data boundaries
- architecture designed for hypothetical scale

## 5. Ship tactically and improve strategically

**Statement**

Deliver the requested behavior while leaving touched code slightly easier to change.

**Operational rule**

Keep most effort on the requested outcome. Fix one small local problem when safe, or report it as a concrete follow-up. Do not turn local improvement into a rewrite.

**Red flags**

- unrelated cleanup hidden inside the change
- repeatedly stepping over visible local debt
- strategic rewrites that dominate the requested work

## 6. Verify claims and honor scope

**Statement**

Evidence supports completion claims. One informed user decision authorizes the agreed scope.

**Operational rule**

State what was verified, what was not, and what remains uncertain. Continue through the agreed work without artificial checkpoints. Return to the user only when scope changes materially, an assumption fails, or a destructive or external action becomes necessary.

**Red flags**

- claiming success without fresh evidence
- treating silence as a product decision
- repeated approval prompts inside unchanged scope
- continuing after material drift
