#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURE="$ROOT/tests/fixtures/nontrivial-calc"

if ! command -v pi >/dev/null 2>&1; then
  echo 'FAIL: pi command not found in system PATH'
  exit 1
fi

WORKDIR="$(mktemp -d)"
KEEP_WORKDIR="${PLANFORGE_KEEP_E2E_WORKDIR:-0}"
trap 'status=$?; if [[ "$status" -ne 0 || "$KEEP_WORKDIR" == "1" ]]; then echo "pi e2e modes artifacts kept at: $WORKDIR"; else rm -rf "$WORKDIR"; fi' EXIT

MAX_FAST_TURNS="${PLANFORGE_E2E_MAX_FAST_TURNS:-5}"
MAX_SUPERVISED_TURNS="${PLANFORGE_E2E_MAX_SUPERVISED_TURNS:-2}"

bootstrap_repo() {
  local dest="$1"
  mkdir -p "$dest"
  cp -R "$FIXTURE"/. "$dest"/
  (
    cd "$dest"
    git init -b main >/dev/null
    git config user.name 'Planforge E2E'
    git config user.email 'planforge-e2e@example.com'
    git add .
    git commit -m 'fixture' >/dev/null
  )
}

run_pi_turn() {
  local repo="$1"
  local session="$2"
  local message="$3"
  local out="$4"

  (
    cd "$repo"
    cmd=(
      pi
      --session "$session"
      --no-extensions
      --extension "$ROOT/extensions/planforge-approval-gate.ts"
      --skill "$ROOT/skills"
      -p "$message"
    )

    if [[ -f "$session" ]]; then
      cmd+=(--continue)
    fi

    "${cmd[@]}" >"$out"
  )
}

tests_pass() {
  local repo="$1"
  (cd "$repo" && npm test >/dev/null 2>&1)
}

repo_changed() {
  local repo="$1"
  (cd "$repo" && ! git diff --quiet -- src/calc.js test/calc.test.js)
}

# 1) Investigate mode should remain non-mutating
INV_REPO="$WORKDIR/investigate"
INV_SESSION="$WORKDIR/investigate.session.jsonl"
INV_OUT="$WORKDIR/investigate.turn1.txt"
bootstrap_repo "$INV_REPO"

run_pi_turn "$INV_REPO" "$INV_SESSION" \
  '/skill:forge-investigate Investigate this repository and make tests pass by implementing parseAndSum in src/calc.js.' \
  "$INV_OUT"

if repo_changed "$INV_REPO"; then
  echo 'FAIL: forge-investigate mutated repository files'
  exit 1
fi

if tests_pass "$INV_REPO"; then
  echo 'FAIL: forge-investigate unexpectedly made tests pass (likely mutated code)'
  exit 1
fi

# 2) Supervised mode should stay read-only before explicit /pf, request it in output,
#    then record a gate-aware continuation message after approval.
SUP_REPO="$WORKDIR/supervised"
SUP_SESSION="$WORKDIR/supervised.session.jsonl"
SUP_OUT0="$WORKDIR/supervised.turn0.txt"
bootstrap_repo "$SUP_REPO"

run_pi_turn "$SUP_REPO" "$SUP_SESSION" \
  '/skill:planforge Implement parseAndSum in src/calc.js so npm test passes. Keep it simple and run verification.' \
  "$SUP_OUT0"

if repo_changed "$SUP_REPO"; then
  echo 'FAIL: planforge supervised mutated before /pf approval'
  exit 1
fi

if ! grep -qi '/pf' "$SUP_OUT0"; then
  echo 'FAIL: planforge supervised response did not request /pf approval'
  exit 1
fi

if ! grep -qi 'Proposed Review Gates' "$SUP_OUT0"; then
  echo 'FAIL: planforge supervised response did not propose review gates'
  exit 1
fi

supervised_recorded=0
for ((i=1; i<=MAX_SUPERVISED_TURNS; i++)); do
  run_pi_turn "$SUP_REPO" "$SUP_SESSION" \
    'pf' \
    "$WORKDIR/supervised.turn${i}.txt"
  if grep -q 'Continue with the approved checkpoint\. Scope v1 is approved\.' "$SUP_SESSION" \
    && grep -q 'Review gates: G1, G2\.' "$SUP_SESSION" \
    && grep -Eq 'Next review gate: G1 \([^)]+\)\.' "$SUP_SESSION"; then
    supervised_recorded=1
    break
  fi
done

if [[ "$supervised_recorded" -ne 1 ]]; then
  echo "FAIL: planforge supervised did not record the gate-aware continuation message within $MAX_SUPERVISED_TURNS approval turns"
  exit 1
fi

# 3) Fast mode should converge without /pf approvals
FAST_REPO="$WORKDIR/fast"
FAST_SESSION="$WORKDIR/fast.session.jsonl"
bootstrap_repo "$FAST_REPO"

run_pi_turn "$FAST_REPO" "$FAST_SESSION" \
  '/skill:planforge-fast I explicitly approve scope for mutation. Implement parseAndSum in src/calc.js and make npm test pass.' \
  "$WORKDIR/fast.turn0.txt"

fast_passed=0
if tests_pass "$FAST_REPO"; then
  fast_passed=1
else
  for ((i=1; i<=MAX_FAST_TURNS; i++)); do
    run_pi_turn "$FAST_REPO" "$FAST_SESSION" \
      'Continue the implementation and finish all required verification until npm test passes.' \
      "$WORKDIR/fast.turn${i}.txt"
    if tests_pass "$FAST_REPO"; then
      fast_passed=1
      break
    fi
  done
fi

if [[ "$fast_passed" -ne 1 ]]; then
  echo "FAIL: planforge-fast did not converge to passing tests within $((MAX_FAST_TURNS + 1)) turns"
  exit 1
fi

if ! repo_changed "$FAST_REPO"; then
  echo 'FAIL: planforge-fast passed without expected source mutation'
  exit 1
fi

echo 'pi e2e modes test: PASS'
