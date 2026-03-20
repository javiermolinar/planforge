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
trap 'status=$?; if [[ "$status" -ne 0 || "$KEEP_WORKDIR" == "1" ]]; then echo "pi e2e pushback artifacts kept at: $WORKDIR"; else rm -rf "$WORKDIR"; fi' EXIT

MAX_PLAN_PUSHBACK_TURNS="${PLANFORGE_E2E_MAX_PLAN_PUSHBACK_TURNS:-2}"
MAX_APPROVAL_TURNS="${PLANFORGE_E2E_MAX_APPROVAL_TURNS:-4}"

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

repo_changed() {
  local repo="$1"
  (cd "$repo" && ! git diff --quiet -- src/calc.js test/calc.test.js)
}

tests_pass() {
  local repo="$1"
  (cd "$repo" && npm test >/dev/null 2>&1)
}

latest_gate_field() {
  local session="$1"
  local field="$2"
  python3 - "$session" "$field" <<'PY'
import json, sys
session_path, field = sys.argv[1], sys.argv[2]
last = None
with open(session_path, 'r', encoding='utf-8') as fh:
    for line in fh:
        line = line.strip()
        if not line:
            continue
        entry = json.loads(line)
        if entry.get('type') == 'custom' and entry.get('customType') == 'planforge-approval-gate-state':
            last = entry.get('data', {})
if last is None:
    raise SystemExit(2)
value = last
for part in field.split('.'):
    if isinstance(value, list):
        value = value[int(part)]
    else:
        value = value.get(part)
if isinstance(value, bool):
    print('true' if value else 'false')
elif value is None:
    print('')
else:
    print(value)
PY
}

latest_gate_count() {
  local session="$1"
  python3 - "$session" <<'PY'
import json, sys
session_path = sys.argv[1]
last = None
with open(session_path, 'r', encoding='utf-8') as fh:
    for line in fh:
        line = line.strip()
        if not line:
            continue
        entry = json.loads(line)
        if entry.get('type') == 'custom' and entry.get('customType') == 'planforge-approval-gate-state':
            last = entry.get('data', {})
if last is None:
    raise SystemExit(2)
print(len(last.get('reviewGates', [])))
PY
}

latest_accepted_gate_count() {
  local session="$1"
  python3 - "$session" <<'PY'
import json, sys
session_path = sys.argv[1]
last = None
with open(session_path, 'r', encoding='utf-8') as fh:
    for line in fh:
        line = line.strip()
        if not line:
            continue
        entry = json.loads(line)
        if entry.get('type') == 'custom' and entry.get('customType') == 'planforge-approval-gate-state':
            last = entry.get('data', {})
if last is None:
    raise SystemExit(2)
print(len(last.get('acceptedReviewGates', [])))
PY
}

REPO="$WORKDIR/pushback"
SESSION="$WORKDIR/pushback.session.jsonl"
bootstrap_repo "$REPO"

run_pi_turn "$REPO" "$SESSION" \
  '/skill:planforge Implement parseAndSum in src/calc.js so npm test passes. Keep it simple and run verification.' \
  "$WORKDIR/pushback.turn0.txt"

if repo_changed "$REPO"; then
  echo 'FAIL: supervised pushback flow mutated before initial approval'
  exit 1
fi

if ! grep -qi '/pf' "$WORKDIR/pushback.turn0.txt"; then
  echo 'FAIL: initial supervised plan did not request /pf approval'
  exit 1
fi

if ! grep -qi 'Proposed Review Gates' "$WORKDIR/pushback.turn0.txt"; then
  echo 'FAIL: initial supervised plan did not propose review gates'
  exit 1
fi

plan_revised=0
for ((i=1; i<=MAX_PLAN_PUSHBACK_TURNS; i++)); do
  run_pi_turn "$REPO" "$SESSION" \
    'Please revise the plan: keep scope limited to src/calc.js only, do not touch tests, and use one final review gate only after implementation and verification.' \
    "$WORKDIR/pushback.plan${i}.txt"

  if repo_changed "$REPO"; then
    echo 'FAIL: plan pushback turn mutated repository files before approval'
    exit 1
  fi

  if [[ "$(latest_gate_field "$SESSION" reviewGatesProposed)" == "true" ]] \
    && [[ "$(latest_gate_count "$SESSION")" == "1" ]] \
    && grep -qi '/pf' "$WORKDIR/pushback.plan${i}.txt"; then
    plan_revised=1
    break
  fi
done

if [[ "$plan_revised" -ne 1 ]]; then
  echo "FAIL: supervised plan pushback did not converge to one revised review gate within $MAX_PLAN_PUSHBACK_TURNS turns"
  exit 1
fi

awaiting_gate=0
for ((i=1; i<=MAX_APPROVAL_TURNS; i++)); do
  run_pi_turn "$REPO" "$SESSION" \
    'pf' \
    "$WORKDIR/pushback.approval${i}.txt"

  if [[ "$(latest_gate_field "$SESSION" acceptanceState)" == "awaiting" ]] \
    && [[ -n "$(latest_gate_field "$SESSION" currentReviewGateId)" ]]; then
    awaiting_gate=1
    break
  fi
done

if [[ "$awaiting_gate" -ne 1 ]]; then
  echo "FAIL: supervised pushback flow did not reach a review gate within $MAX_APPROVAL_TURNS approval turns"
  exit 1
fi

if ! repo_changed "$REPO"; then
  echo 'FAIL: supervised pushback flow reached gate without expected source mutation'
  exit 1
fi

if ! tests_pass "$REPO"; then
  echo 'FAIL: supervised pushback flow reached final gate without passing tests'
  exit 1
fi

run_pi_turn "$REPO" "$SESSION" \
  'needs changes: before I accept this gate, revise the review packet to include a short diff summary along with the npm test evidence.' \
  "$WORKDIR/pushback.gate-revise.txt"

if [[ "$(latest_gate_field "$SESSION" acceptanceState)" != "revise_requested" ]]; then
  echo 'FAIL: gate pushback did not move the session into revise_requested state'
  exit 1
fi

if [[ "$(latest_gate_field "$SESSION" approved)" != "false" ]]; then
  echo 'FAIL: gate pushback did not clear approval'
  exit 1
fi

run_pi_turn "$REPO" "$SESSION" \
  'pf' \
  "$WORKDIR/pushback.accept.txt"

if [[ "$(latest_gate_field "$SESSION" approved)" != "true" ]]; then
  echo 'FAIL: pf did not re-approve after gate revision pushback'
  exit 1
fi

if [[ "$(latest_gate_field "$SESSION" acceptanceState)" != "accepted" ]]; then
  echo 'FAIL: pf did not mark the revised gate as accepted'
  exit 1
fi

if [[ "$(latest_accepted_gate_count "$SESSION")" == "0" ]]; then
  echo 'FAIL: accepted review gates were not recorded after gate pushback recovery'
  exit 1
fi

echo 'pi e2e pushback test: PASS'
