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
Validate the Planforge shell workflow.
EOF

grep -q 'Validate the Planforge shell workflow.' "$PLAN_PATH"

"$ROOT/scripts/plan-set-section" TASKS <<'EOF'
## Tasks
- [ ] Define the rolling plan format
- [ ] Implement the shell helpers
EOF

grep -q 'Define the rolling plan format' "$PLAN_PATH"
grep -q 'Implement the shell helpers' "$PLAN_PATH"

"$ROOT/scripts/plan-set-section" TEST_TABLE <<'EOF'
## Test table
| Case | Type | Expected | Status |
|---|---|---|---|
| create plan | integration | file exists | pending |
EOF

grep -q '| create plan | integration | file exists | pending |' "$PLAN_PATH"

"$ROOT/scripts/plan-append-item" BACKLOG 'Consider adding plan-list later'
"$ROOT/scripts/plan-append-item" CHECKPOINTS 'Initialized the rolling plan'
"$ROOT/scripts/plan-ship" --token-usage 'prompt 120 | completion 80 | total 200' --model 'gpt-5'

grep -q '^Status: shipped$' "$PLAN_PATH"
grep -q '^Token usage: prompt 120 | completion 80 | total 200$' "$PLAN_PATH"
grep -q '^Model: gpt-5$' "$PLAN_PATH"
grep -q '^END OF SHIPPED PLAN$' "$PLAN_PATH"

LIST_OUTPUT="$($ROOT/scripts/plan-list)"
printf '%s\n' "$LIST_OUTPUT" | grep '^REPO=sample-repo$'
printf '%s\n' "$LIST_OUTPUT" | grep '^BRANCH=main$'
printf '%s\n' "$LIST_OUTPUT" | grep '^STATUS=shipped$'
printf '%s\n' "$LIST_OUTPUT" | grep "^PLAN_PATH=$PLAN_PATH$"

BRANCH_NAME="$($ROOT/scripts/plan-branch-name feat 'HN top CLI')"
test "$BRANCH_NAME" = 'feat/hn-top-cli'

SCORECARD_PATH="$($ROOT/scripts/scorecard-init api-cli)"
test -f "$SCORECARD_PATH"
grep -q '^# Planforge scorecard' "$SCORECARD_PATH"

NEXT_PATH="$($ROOT/scripts/plan-next-init deferred-window-cleanup)"
test -f "$NEXT_PATH"
case "$NEXT_PATH" in
  "$PLANFORGE_HOME"/plans/sample-repo/next/*) ;;
  *)
    echo "unexpected next path: $NEXT_PATH" >&2
    exit 1
    ;;
esac

NEXT_PATH_2="$($ROOT/scripts/plan-next-init deferred-window-cleanup)"
test -f "$NEXT_PATH_2"
if [ "$NEXT_PATH" = "$NEXT_PATH_2" ]; then
  echo "expected unique deferred plan paths, got same path twice: $NEXT_PATH" >&2
  exit 1
fi

NEXT_LIST_OUTPUT="$($ROOT/scripts/plan-next-list)"
printf '%s\n' "$NEXT_LIST_OUTPUT" | grep '^REPO=sample-repo$'
printf '%s\n' "$NEXT_LIST_OUTPUT" | grep '^STATUS=deferred$'
printf '%s\n' "$NEXT_LIST_OUTPUT" | grep "^NEXT_PLAN_PATH=$NEXT_PATH$"
printf '%s\n' "$NEXT_LIST_OUTPUT" | grep "^NEXT_PLAN_PATH=$NEXT_PATH_2$"

LIST_OUTPUT_AFTER_NEXT="$($ROOT/scripts/plan-list)"
printf '%s\n' "$LIST_OUTPUT_AFTER_NEXT" | grep "^PLAN_PATH=$PLAN_PATH$"
if printf '%s\n' "$LIST_OUTPUT_AFTER_NEXT" | grep -q '/next/'; then
  echo "plan-list should not include deferred next queue paths" >&2
  exit 1
fi

grep -q 'Consider adding plan-list later' "$PLAN_PATH"
grep -q 'Initialized the rolling plan' "$PLAN_PATH"

echo 'plan script smoke test: PASS'
