#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT

export HOME="$TEST_DIR/home"
export PLANFORGE_HOME="$TEST_DIR/custom-planforge-home"
mkdir -p "$HOME" "$PLANFORGE_HOME"

REPO_DIR="$TEST_DIR/sample-repo"
mkdir -p "$REPO_DIR"
cd "$REPO_DIR"

git init -b main >/dev/null
printf '# sample\n' > README.md
git add README.md
git -c user.name='Planforge Test' -c user.email='test@example.com' commit -m 'init' >/dev/null

CONTEXT="$($ROOT/scripts/plan-context)"
printf '%s\n' "$CONTEXT" | grep '^REPO_SLUG=sample-repo$'
printf '%s\n' "$CONTEXT" | grep '^BRANCH=main$'
PLAN_PATH="$(printf '%s\n' "$CONTEXT" | awk -F= '/^PLAN_PATH=/{print $2}')"
test "$PLAN_PATH" = "$PLANFORGE_HOME/plans/sample-repo/main.md"

"$ROOT/scripts/plan-init"
test -f "$PLAN_PATH"
grep -q '^Repo: sample-repo$' "$PLAN_PATH"
grep -q '^Branch: main$' "$PLAN_PATH"
grep -q '<!-- BEGIN:TASKS -->' "$PLAN_PATH"

"$ROOT/scripts/plan-set-section" CURRENT_GOAL <<'EOF'
## Current goal
Validate the trimmed Planforge shell workflow.
EOF

grep -q 'Validate the trimmed Planforge shell workflow.' "$PLAN_PATH"

"$ROOT/scripts/plan-set-section" TASKS <<'EOF'
## Tasks
- [ ] Define the rolling plan format
- [ ] Implement the remaining shell helpers
EOF

grep -q 'Define the rolling plan format' "$PLAN_PATH"
grep -q 'Implement the remaining shell helpers' "$PLAN_PATH"

"$ROOT/scripts/plan-set-section" TEST_TABLE <<'EOF'
## Test table
| Case | Type | Expected | Status |
|---|---|---|---|
| create plan | integration | file exists | pending |
EOF

grep -q '| create plan | integration | file exists | pending |' "$PLAN_PATH"

"$ROOT/scripts/plan-append-item" BACKLOG 'Consider one more simplification pass later'
"$ROOT/scripts/plan-append-item" CHECKPOINTS 'Initialized the rolling plan'
"$ROOT/scripts/plan-ship" --token-usage 'prompt 120 | completion 80 | total 200' --model 'gpt-5'

grep -q '^Status: shipped$' "$PLAN_PATH"
grep -q '^Token usage: prompt 120 | completion 80 | total 200$' "$PLAN_PATH"
grep -q '^Model: gpt-5$' "$PLAN_PATH"
grep -q '^END OF SHIPPED PLAN$' "$PLAN_PATH"
grep -q 'Consider one more simplification pass later' "$PLAN_PATH"
grep -q 'Initialized the rolling plan' "$PLAN_PATH"

BROKEN_SET_SECTION_PATH="$TEST_DIR/broken-set-section-plan.md"
awk '$0 != "<!-- END:TASKS -->"' "$PLAN_PATH" > "$BROKEN_SET_SECTION_PATH"
if "$ROOT/scripts/plan-set-section" --path "$BROKEN_SET_SECTION_PATH" TASKS <<'EOF'
## Tasks
- [ ] This should fail because markers are broken
EOF
then
  echo "expected plan-set-section to fail when section markers are missing" >&2
  exit 1
fi

BROKEN_APPEND_PATH="$TEST_DIR/broken-append-plan.md"
awk '$0 != "<!-- END:BACKLOG -->"' "$PLAN_PATH" > "$BROKEN_APPEND_PATH"
if "$ROOT/scripts/plan-append-item" --path "$BROKEN_APPEND_PATH" BACKLOG 'this should fail'
then
  echo "expected plan-append-item to fail when section markers are missing" >&2
  exit 1
fi

echo 'plan script smoke test: PASS'
