# Integration tests

Planforge uses two layers of integration testing:

1. **Deterministic contract tests (CI default)**
   - `tests/test-mode-contract.sh`
   - `tests/test-approval-gate-behavior.sh`
   - `tests/test-pi-package.sh`
2. **Live Pi workflow test (manual run)**
   - `tests/test-pi-e2e-modes.sh`

## Why two layers

- Deterministic tests catch structural regressions quickly and cheaply.
- Live Pi tests catch orchestration drift across skills, extension state, prompts, and tool behavior.

## Live E2E: 3-mode iteration

`tests/test-pi-e2e-modes.sh` runs three scenarios against a non-trivial fixture (`tests/fixtures/nontrivial-calc`):

1. `forge-investigate` (read-only)
   - asks for implementation anyway
   - asserts repository remains unchanged
2. `planforge` (supervised)
   - asserts no mutation before `/pf`
   - asserts response explicitly requests `/pf`
3. `planforge-fast` (unsupervised)
   - starts with explicit scope approval in prompt
   - expects convergence without `/pf`

## Run locally

```bash
bash tests/test-pi-e2e-modes.sh
```

Optional controls:

```bash
PLANFORGE_E2E_MAX_SUPERVISED_TURNS=12 PLANFORGE_E2E_MAX_FAST_TURNS=6 bash tests/test-pi-e2e-modes.sh
PLANFORGE_KEEP_E2E_WORKDIR=1 bash tests/test-pi-e2e-modes.sh
```

Notes:
- Requires `pi` binary available in system `PATH`.
- Uses your existing Pi configuration and default model/provider.
- This test is manual (not part of regular PR CI) because it consumes model tokens.

## Suggested CI strategy

- Keep deterministic tests on PRs.
- Run live E2E modes test manually before release or when changing skills/gate behavior.
- Keep it outside GitHub workflows to avoid unintended token spend.
