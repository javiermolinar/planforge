---
name: forge-investigate
description: Investigate a bounded question about repository behavior, architecture, dependencies, risks, or change impact using local evidence without modifying the repository. Use only when the user explicitly requests a read-only codebase investigation.
disable-model-invocation: true
---

# Forge Investigate

Forge Investigate is the read-only investigation skill in the Planforge engineering suite.

Before starting, read and follow:

- `../../docs/philosophy.md`
- `../../docs/core.md`

## Contract

- Remain read-only for the entire run. Do not edit or write files, change branches or refs, install dependencies, or run commands expected to alter the working tree.
- Investigate automatically before asking the user for repository-answerable facts.
- Answer a bounded question from local primary evidence: source, tests, documentation, configuration, and Git history.
- Distinguish facts, inferences, and unknowns. Support every material conclusion with a source path, symbol, or command result.
- Do not use the network, create permanent artifacts, or turn the investigation into implementation.
- If the prompt also requests changes, finish the investigation and recommend Forge for the implementation step.
- Stop when the question is answered with sufficient evidence. Do not inventory unrelated parts of the repository.

## Flow

### 1. Bound the question

State the question the investigation must answer and any important non-goals. Infer these from the prompt and repository evidence when possible.

Start with the cheap orientation pass from `docs/core.md`. Ask a scope question only when different answers would materially change what must be investigated and the repository cannot resolve it.

### 2. Trace the owning path

Follow the primary behavior path that owns the answer. Inspect only the relevant:

- entry points and callers
- interfaces, data ownership, and side effects
- tests and documentation
- configuration and generated-artifact obligations
- local Git history when current files do not explain intent

Prefer the source that owns a claim over comments or summaries of it. Deepen only while a material conclusion depends on more evidence.

### 3. Check explanations

Use narrow, existing checks only when they are necessary, available without setup, and not expected to alter the working tree. Record the command and result.

For causal questions, do not present code-reading intuition as root cause. Label it as an inference unless direct evidence establishes the cause. If proof requires dependency installation, network access, a full build or suite, branch switching, temporary instrumentation, or repository mutation, do not perform it. State the exact blocked probe and why it matters.

### 4. Stop deliberately

The investigation is ready when:

- the bounded question has a direct answer
- relevant behavior and interfaces have been traced far enough to support it
- every material conclusion has repository evidence
- checks performed and checks not run are explicit
- remaining unknowns cannot be resolved cheaply and read-only
- likely change surface, obligations, verification path, and size are known when the question contemplates a change

Stop at that point. More repository coverage is not additional confidence unless it can change the answer.

### 5. Report

Use this compact structure:

```md
## Investigation

### Answer
- direct answer to the bounded question

### Evidence
- material finding — `path`, symbol, or command result

### Behavior Path
- relevant flow and interfaces; omit when it adds no value

### Unknowns / Risks
- unverified claims, blocked probes, or `None`

### Change Implications
- likely surface, obligations, verification path, and Small/Medium/Large size
- include only when a prospective change is part of the question

### Recommended Next Step
- stop, run one named deeper probe, or use `/skill:forge` for delivery
```

Keep findings concise. Do not create a Markdown report in the repository unless the user leaves this skill and explicitly requests that mutation through an appropriate workflow.
