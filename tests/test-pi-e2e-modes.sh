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

MAX_SUPERVISED_TURNS="${PLANFORGE_E2E_MAX_SUPERVISED_TURNS:-2}"
MAX_SUPERVISED_WORK_TURNS="${PLANFORGE_E2E_MAX_SUPERVISED_WORK_TURNS:-6}"

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

latest_acceptance_state() {
  local session="$1"
  node -e '
    const fs = require("fs");
    const file = process.argv[1];
    if (!fs.existsSync(file)) process.exit(0);
    const lines = fs.readFileSync(file, "utf8").split(/\n/);
    let acceptance = "";
    for (const line of lines) {
      if (!line.includes("planforge-approval-gate-state")) continue;
      const match = line.match(/"acceptanceState":"([^"]+)"/);
      if (match) acceptance = match[1];
    }
    process.stdout.write(acceptance);
  ' "$session"
}

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
    && grep -Eq 'Review gates: [A-Za-z0-9_, -]+\.' "$SUP_SESSION" \
    && grep -Eq 'Next review gate: [A-Za-z0-9_-]+ \([^)]+\)\.' "$SUP_SESSION"; then
    supervised_recorded=1
    break
  fi
done

if [[ "$supervised_recorded" -ne 1 ]]; then
  echo "FAIL: planforge supervised did not record the gate-aware continuation message within $MAX_SUPERVISED_TURNS approval turns"
  exit 1
fi

supervised_passed=0
for ((i=1; i<=MAX_SUPERVISED_WORK_TURNS; i++)); do
  if tests_pass "$SUP_REPO"; then
    supervised_passed=1
    break
  fi

  acceptance_state="$(latest_acceptance_state "$SUP_SESSION")"
  if [[ "$acceptance_state" == "revise_requested" ]]; then
    echo 'FAIL: planforge supervised happy path unexpectedly entered revise_requested'
    exit 1
  fi

  if [[ "$acceptance_state" == "awaiting" ]]; then
    run_pi_turn "$SUP_REPO" "$SUP_SESSION" \
      'pf' \
      "$WORKDIR/supervised.approval${i}.txt"
  else
    run_pi_turn "$SUP_REPO" "$SUP_SESSION" \
      'Continue the approved implementation, keep scope tight, and drive the task to passing tests with verification evidence.' \
      "$WORKDIR/supervised.work${i}.txt"
  fi

  acceptance_state="$(latest_acceptance_state "$SUP_SESSION")"
  if [[ "$acceptance_state" == "revise_requested" ]]; then
    echo 'FAIL: planforge supervised happy path unexpectedly entered revise_requested'
    exit 1
  fi

  if tests_pass "$SUP_REPO"; then
    supervised_passed=1
    break
  fi
done

if [[ "$supervised_passed" -ne 1 ]]; then
  echo "FAIL: planforge supervised did not converge to passing tests within $MAX_SUPERVISED_WORK_TURNS supervised work turns"
  exit 1
fi

if ! repo_changed "$SUP_REPO"; then
  echo 'FAIL: planforge supervised passed without expected source mutation'
  exit 1
fi

echo 'pi e2e modes test: PASS'
