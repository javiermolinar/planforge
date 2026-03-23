# Integration tests

Planforge uses two layers of integration testing:

1. **Deterministic contract tests (CI default)**
   - `tests/test-mode-contract.sh`
   - `tests/test-approval-gate-behavior.sh`
   - `tests/test-pi-package.sh`
2. **Live Pi workflow tests (manual run)**
   - `tests/test-pi-e2e-modes.sh`
   - `tests/test-pi-e2e-pushback.sh`

## Why two layers

- Deterministic tests catch structural regressions quickly and cheaply.
- Live Pi tests catch orchestration drift across skills, extension state, prompts, and tool behavior.

## Live E2E: supervised iteration

`tests/test-pi-e2e-modes.sh` runs a supervised scenario against a non-trivial fixture (`tests/fixtures/nontrivial-calc`):

1. `planforge`
   - asserts no mutation before `/pf`
   - asserts response explicitly requests `/pf`
   - asserts review gates are proposed before approval
   - asserts the approved continuation message records scope + review-gate context after `/pf`
   - continues the supervised loop to passing tests without drifting into the review-revision path

## Live E2E: supervised pushback flow

`tests/test-pi-e2e-pushback.sh` exercises a supervised workflow with two kinds of operator pushback against the same fixture:

1. plan/review-gate pushback before approval
   - asks for a revised plan
   - narrows review gates to one final gate
   - asserts repository remains unchanged before approval
2. review-gate pushback after implementation evidence is presented
   - asks for a revised review packet before acceptance
   - asserts the session enters `revise_requested`
   - asserts `/pf` accepts the revised gate and records acceptance

## Run locally

```bash
bash tests/test-pi-e2e-modes.sh
bash tests/test-pi-e2e-pushback.sh
```

Optional controls:

```bash
PLANFORGE_E2E_MAX_SUPERVISED_TURNS=12 PLANFORGE_E2E_MAX_SUPERVISED_WORK_TURNS=8 bash tests/test-pi-e2e-modes.sh
PLANFORGE_E2E_MAX_PLAN_PUSHBACK_TURNS=2 PLANFORGE_E2E_MAX_APPROVAL_TURNS=4 bash tests/test-pi-e2e-pushback.sh
PLANFORGE_KEEP_E2E_WORKDIR=1 bash tests/test-pi-e2e-modes.sh
PLANFORGE_KEEP_E2E_WORKDIR=1 bash tests/test-pi-e2e-pushback.sh
```

Notes:
- Requires `pi` binary available in system `PATH`.
- Uses your existing Pi configuration and default model/provider.
- This test is manual (not part of regular PR CI) because it consumes model tokens.

## Suggested CI strategy

- Keep deterministic tests on PRs.
- Run live E2E modes test manually before release or when changing skills/gate behavior.
- Keep it outside GitHub workflows to avoid unintended token spend.
