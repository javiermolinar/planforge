#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

node <<'NODE'
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadExtension(filePath) {
  let source = fs.readFileSync(filePath, "utf8");
  source = source.replace(/export default function\s*\(/, "module.exports = function (");

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require,
    console,
    setTimeout,
    clearTimeout,
  };

  vm.createContext(sandbox);
  new vm.Script(source, { filename: filePath }).runInContext(sandbox);

  if (typeof sandbox.module.exports !== "function") {
    throw new Error("Failed to load extension function");
  }

  return sandbox.module.exports;
}

function createHarness(hasUI = true, currentBranch = "feat/test-harness") {
  const handlers = new Map();
  const commands = new Map();
  const branch = [];
  const sentUserMessages = [];
  const statuses = new Map();
  const notifications = [];

  process.env.PLANFORGE_TEST_CURRENT_BRANCH = currentBranch;

  const pi = {
    on(name, handler) {
      if (!handlers.has(name)) handlers.set(name, []);
      handlers.get(name).push(handler);
    },
    registerCommand(name, config) {
      commands.set(name, config);
    },
    appendEntry(customType, data) {
      branch.push({ type: "custom", customType, data });
    },
    sendUserMessage(message) {
      sentUserMessages.push(message);
    },
  };

  const ctx = {
    hasUI,
    ui: {
      notify(message, level) {
        notifications.push({ message, level });
      },
      setStatus(key, value) {
        statuses.set(key, value);
      },
      setWidget() {},
      custom: async () => {},
    },
    sessionManager: {
      getBranch: () => branch,
    },
  };

  async function emit(name, event = {}) {
    let result;
    for (const handler of handlers.get(name) || []) {
      const next = await handler(event, ctx);
      if (next !== undefined) result = next;
    }
    return result;
  }

  async function runCommand(name, args = {}) {
    const command = commands.get(name);
    if (!command) throw new Error(`Command not registered: ${name}`);
    return command.handler(args, ctx);
  }

  function getState() {
    for (let i = branch.length - 1; i >= 0; i -= 1) {
      const entry = branch[i];
      if (entry.customType === "planforge-approval-gate-state") return entry.data;
    }
    return null;
  }

  function getSentUserMessages() {
    return [...sentUserMessages];
  }

  function getStatus(key) {
    return statuses.get(key);
  }

  function getNotifications() {
    return [...notifications];
  }

  return { pi, emit, runCommand, getState, getSentUserMessages, getStatus, getNotifications };
}

const extensionPath = path.join(process.cwd(), "extensions", "planforge-approval-gate.ts");
const installApprovalGate = loadExtension(extensionPath);

async function emitReviewGateProposal(harness) {
  await harness.emit("message_end", {
    message: {
      role: "assistant",
      content: [
        {
          type: "text",
          text: "## Proposed Review Gates\n| Gate ID | Trigger | Required evidence | Why this gate |\n|---|---|---|---|\n| RG1 | before mutation | build + smoke | keep drift low |",
        },
      ],
    },
  });
}

async function emitReviewGateProposalWithCloseout(harness) {
  await harness.emit("message_end", {
    message: {
      role: "assistant",
      content: [
        {
          type: "text",
          text: "## Repo Obligations\n| Obligation | Source | Trigger | Planned handling | Status |\n|---|---|---|---|---|\n| make docs | Makefile | CLI/docs drift | run in closeout | planned |\n\n## Closeout Scope\n- Allowed trailing operations: regenerate docs, run mandated verification, commit, push, draft PR\n- Allowed file classes / paths: generated docs and markdown only\n- Invalidates closeout lane if: new source edits are needed\n- Final closeout evidence to report: docs regen + verification + commit/push/PR status\n\n## Proposed Review Gates\n| Gate ID | Trigger | Required evidence | Why this gate |\n|---|---|---|---|\n| RG1 | final review | verified vs unverified + diff summary | keep closeout bounded |",
        },
      ],
    },
  });
}

async function testInactiveStatusIsHiddenUntilPlanforgeStarts() {
  const harness = createHarness();
  installApprovalGate(harness.pi);

  await harness.emit("session_start", {});
  assert(harness.getStatus("planforge-gate") === undefined, "inactive sessions should not render PF status");

  await harness.emit("input", { text: "/skill:planforge" });
  assert(
    typeof harness.getStatus("planforge-gate") === "string" && harness.getStatus("planforge-gate").includes("waiting approval"),
    "starting planforge should render PF status"
  );

  const headlessHarness = createHarness(false);
  installApprovalGate(headlessHarness.pi);
  await headlessHarness.emit("session_start", {});
  await headlessHarness.runCommand("pf", { raw: "status" });
  assert(
    headlessHarness.getSentUserMessages().some((m) => String(m).includes("Planforge is not active in this session")),
    "pf status should explain how to activate Planforge when inactive"
  );
}

async function testInvestigateModeIsReadOnly() {
  const harness = createHarness();
  installApprovalGate(harness.pi);

  await harness.emit("session_start", {});
  await harness.emit("input", { text: "/skill:forge-investigate" });

  const state = harness.getState();
  assert(state && state.executionMode === "none", "forge-investigate should switch to mode 'none'");

  const blockedEdit = await harness.emit("tool_call", { toolName: "edit", input: { path: "README.md" } });
  assert(blockedEdit && blockedEdit.block === true, "edit must be blocked in investigate mode");

  const blockedMutatingBash = await harness.emit("tool_call", {
    toolName: "bash",
    input: { command: "echo x > /tmp/planforge-test" },
  });
  assert(blockedMutatingBash && blockedMutatingBash.block === true, "mutating bash must be blocked in investigate mode");

  const blockedMetaBash = await harness.emit("tool_call", {
    toolName: "bash",
    input: { command: "ls > /tmp/planforge-bypass" },
  });
  assert(blockedMetaBash && blockedMetaBash.block === true, "redirection bypass attempts must be blocked in investigate mode");

  const allowedPipeBash = await harness.emit("tool_call", {
    toolName: "bash",
    input: { command: "git status | wc -l" },
  });
  assert(allowedPipeBash === undefined, "safe read-only pipelines should remain allowed in investigate mode");

  const allowedReadOnlyBash = await harness.emit("tool_call", { toolName: "bash", input: { command: "ls -la" } });
  assert(allowedReadOnlyBash === undefined, "read-only bash should remain allowed in investigate mode");

  const beforeStart = await harness.emit("before_agent_start", { systemPrompt: "SYSTEM" });
  assert(
    typeof beforeStart?.systemPrompt === "string" && beforeStart.systemPrompt.includes("[Planforge investigation mode]"),
    "before_agent_start should inject investigate-mode read-only prompt"
  );
}

async function testCheckpointLifecycle() {
  const harness = createHarness();
  installApprovalGate(harness.pi);

  await harness.emit("session_start", {});
  await harness.emit("input", { text: "/skill:planforge" });
  await emitReviewGateProposal(harness);

  let state = harness.getState();
  assert(state && state.reviewGatesProposed === true, "review gate proposal should be captured from assistant message");
  assert(Array.isArray(state.reviewGates) && state.reviewGates.length >= 1, "review gate proposal should parse structured gate rows");

  const allowedQuotedRg = await harness.emit("tool_call", {
    toolName: "bash",
    input: { command: 'rg -n "bash|zsh|completion" .' },
  });
  assert(allowedQuotedRg === undefined, "quoted rg alternation should remain allowed before approval");

  const allowedReadOnlyChain = await harness.emit("tool_call", {
    toolName: "bash",
    input: { command: 'pwd && rg -n "bash|zsh|completion" .' },
  });
  assert(allowedReadOnlyChain === undefined, "allowlisted read-only command chains should remain allowed before approval");

  const allowedGitRemoteAndPrintf = await harness.emit("tool_call", {
    toolName: "bash",
    input: { command: 'git status --short && printf "remote" && git remote -v' },
  });
  assert(allowedGitRemoteAndPrintf === undefined, "semantic read-only command chains should remain allowed before approval");

  const allowedReadOnlyPipeline = await harness.emit("tool_call", {
    toolName: "bash",
    input: { command: 'git status | wc -l && rg -n "bash|zsh|completion" . | head -n 5' },
  });
  assert(allowedReadOnlyPipeline === undefined, "safe read-only pipelines should remain allowed before approval");

  const allowedReadOnlyCurl = await harness.emit("tool_call", {
    toolName: "bash",
    input: { command: 'curl -I -sS https://example.com' },
  });
  assert(allowedReadOnlyCurl === undefined, "strict read-only curl should remain allowed before approval");

  const blockedMutatingCurl = await harness.emit("tool_call", {
    toolName: "bash",
    input: { command: 'curl -X POST https://example.com' },
  });
  assert(blockedMutatingCurl && blockedMutatingCurl.block === true, "mutating curl should be blocked before approval");

  const blockedPreApprovalEdit = await harness.emit("tool_call", { toolName: "edit", input: { path: "README.md" } });
  assert(blockedPreApprovalEdit && blockedPreApprovalEdit.block === true, "pre-approval edit must be blocked");
  assert(
    blockedPreApprovalEdit.reason.includes("RG1") && blockedPreApprovalEdit.reason.includes("/pf status"),
    "blocked edit reason should surface next review gate and status hint"
  );

  const blockedPreApprovalMetaBash = await harness.emit("tool_call", {
    toolName: "bash",
    input: { command: "ls > /tmp/planforge-pre-approval" },
  });
  assert(
    blockedPreApprovalMetaBash && blockedPreApprovalMetaBash.block === true,
    "pre-approval redirection bypass attempts must be blocked"
  );
  assert(
    blockedPreApprovalMetaBash.reason.includes("RG1") && blockedPreApprovalMetaBash.reason.includes("/pf status"),
    "blocked bash reason should surface next review gate and status hint"
  );
  assert(
    blockedPreApprovalMetaBash.reason.includes("Offending segment"),
    "blocked bash reason should explain the offending segment"
  );

  await harness.runCommand("pf", {});

  state = harness.getState();
  assert(state && state.approved === true, "pf should approve current scope");
  assert(state.reviewGatesApproved === true, "scope approval should mark review gates approved");
  const scopeV1 = state.scopeVersion;

  const firstMutation = await harness.emit("tool_call", { toolName: "edit", input: { path: "README.md" } });
  assert(firstMutation === undefined, "mutation should be allowed after approval");

  state = harness.getState();
  assert(state.approved === true, "approval should remain active between mutations until review gate");
  assert(state.acceptanceState === "accepted", "acceptance state remains accepted before review gate");

  await harness.emit("message_end", {
    message: {
      role: "assistant",
      content: [{ type: "text", text: "REVIEW_GATE_REACHED: G1\nBuild evidence\nVerified vs unverified\n- build pass\n- smoke pass\n- negative-path pass" }],
    },
  });

  state = harness.getState();
  assert(state.approved === false, "reaching review packet should pause mutation approval");
  assert(state.acceptanceState === "awaiting", "review gate should await acceptance");
  assert(typeof state.currentReviewGateId === "string" && state.currentReviewGateId.length > 0, "review gate should track current gate id when awaiting acceptance");
  const awaitingGateId = state.currentReviewGateId;
  const proposedGateCount = Array.isArray(state.reviewGates) ? state.reviewGates.length : 0;

  await harness.emit("input", { text: "needs changes: before I accept this gate, include a diff summary with the evidence" });
  state = harness.getState();
  assert(state.acceptanceState === "revise_requested", "gate pushback should mark scenario revision requested");
  assert(state.approved === false, "gate pushback should keep approval cleared");
  assert(state.currentReviewGateId === awaitingGateId, "gate pushback should preserve the current review gate id");
  assert(Array.isArray(state.reviewGates) && state.reviewGates.length === proposedGateCount, "gate pushback should not clear proposed review gates");

  await harness.runCommand("pf", {});
  state = harness.getState();
  assert(state.acceptanceState === "accepted", "pf should accept revised review gate");
  assert(state.approved === true, "pf should also approve next scope after revised review gate");
  assert(state.scopeVersion === scopeV1 + 1, "next scope should be advanced after accepted review gate");
  assert(Array.isArray(state.acceptedReviewGates) && state.acceptedReviewGates.length >= 1, "accepted review gates should be tracked");

  await harness.emit("tool_call", { toolName: "edit", input: { path: "docs/pi.md" } });
  state = harness.getState();
  assert(state.approved === true, "next mutation should be allowed after one continue");
}

async function testNaturalLanguageAcceptanceAndScopeReplan() {
  const harness = createHarness();
  installApprovalGate(harness.pi);

  await harness.emit("session_start", {});
  await harness.emit("input", { text: "/skill:planforge" });
  await emitReviewGateProposal(harness);
  await harness.runCommand("pf", {});

  let state = harness.getState();
  const scopeV1 = state.scopeVersion;

  await harness.emit("message_end", {
    message: {
      role: "assistant",
      content: [{ type: "text", text: "REVIEW_GATE_REACHED: RG1\nEvidence\nVerified vs unverified\n- build\n- smoke\n- negative path" }],
    },
  });

  state = harness.getState();
  assert(state.approved === false && state.acceptanceState === "awaiting", "review gate should await acceptance before natural-language confirmation");

  const acceptResult = await harness.emit("input", { text: "looks good, continue" });
  assert(acceptResult && acceptResult.action === "transform", "natural-language acceptance should transform into a continuation prompt");

  state = harness.getState();
  assert(state.acceptanceState === "accepted", "natural-language acceptance should mark the scenario accepted");
  assert(state.approved === true, "natural-language acceptance should approve the next scope");
  assert(state.scopeVersion === scopeV1 + 1, "natural-language acceptance should advance scope only when the new scope is approved");
  assert(Array.isArray(state.acceptedReviewGates) && state.acceptedReviewGates.includes("RG1"), "accepted review gates should be retained after natural-language acceptance");

  await harness.emit("input", { text: "also keep the review packet compact and stay within the same fix scope" });
  state = harness.getState();
  assert(state.approved === false, "non-trivial follow-up should still invalidate prior approval");
  assert(state.scopeVersion === scopeV1 + 1, "scope version should not bump until the revised scope is actually approved");
  assert(state.pendingScopeAdvance === true, "scope invalidation should stage the next scope advance instead of bumping immediately");
  assert(state.reviewGatesProposed === true, "scope invalidation should preserve parsed review-gate context for replanning");
  assert(Array.isArray(state.reviewGates) && state.reviewGates.length === 1 && state.reviewGates[0].id === "RG1", "scope invalidation should retain parsed review gates instead of forgetting them");
  assert(Array.isArray(state.acceptedReviewGates) && state.acceptedReviewGates.includes("RG1"), "scope invalidation should preserve accepted review gate history");
}

async function testBenchmarkProfile() {
  const harness = createHarness();
  installApprovalGate(harness.pi);

  await harness.emit("session_start", {});
  await harness.emit("input", {
    text: "/skill:planforge-fast I explicitly approve scope for mutation. Run benchmark: build a tiny CLI and scorecard.",
  });

  let state = harness.getState();
  assert(state && state.benchmarkMode === true, "benchmark hints in prompt should auto-enable benchmark profile");

  let beforeStart = await harness.emit("before_agent_start", { systemPrompt: "SYSTEM" });
  assert(
    typeof beforeStart?.systemPrompt === "string" && beforeStart.systemPrompt.includes("[Planforge benchmark profile]"),
    "before_agent_start should inject benchmark profile guidance when enabled"
  );

  await harness.runCommand("pf", { raw: "benchmark off" });
  state = harness.getState();
  assert(state && state.benchmarkMode === false, "pf benchmark off should disable benchmark profile");

  beforeStart = await harness.emit("before_agent_start", { systemPrompt: "SYSTEM" });
  assert(
    beforeStart === undefined ||
      (typeof beforeStart?.systemPrompt === "string" &&
        !beforeStart.systemPrompt.includes("[Planforge benchmark profile]")),
    "benchmark profile guidance should be omitted when disabled"
  );

  await harness.emit("input", { text: "/pf benchmark on" });
  state = harness.getState();
  assert(state && state.benchmarkMode === true, "input command /pf benchmark on should enable benchmark profile");
}

async function testCompactPlanningGuidanceInjected() {
  const harness = createHarness();
  installApprovalGate(harness.pi);

  await harness.emit("session_start", {});
  await harness.emit("input", { text: "/skill:planforge" });

  const beforeStart = await harness.emit("before_agent_start", { systemPrompt: "SYSTEM" });
  assert(
    typeof beforeStart?.systemPrompt === "string" && beforeStart.systemPrompt.includes("Keep plan/review output compact by default"),
    "before_agent_start should inject compact planning guidance"
  );
  assert(
    typeof beforeStart?.systemPrompt === "string" && beforeStart.systemPrompt.includes("Want more detail? Reply with a number:"),
    "compact planning guidance should include the numbered follow-up menu"
  );
  assert(
    typeof beforeStart?.systemPrompt === "string" && beforeStart.systemPrompt.includes("5. Red flags 6. Full plan"),
    "compact planning guidance should include red-flag follow-up detail"
  );
  assert(
    typeof beforeStart?.systemPrompt === "string" && beforeStart.systemPrompt.includes("Surface Red Flags only when they are real and actionable"),
    "compact planning guidance should require red flags to stay signal-only"
  );
  assert(
    typeof beforeStart?.systemPrompt === "string" && beforeStart.systemPrompt.includes("At review gates, prefer a short Summary, Diff, Verify, and optional Red Flags block"),
    "compact planning guidance should also include compact review-gate summary guidance"
  );
}

async function testReviewGatePushbackFlow() {
  const harness = createHarness();
  installApprovalGate(harness.pi);

  await harness.emit("session_start", {});
  await harness.emit("input", { text: "/skill:planforge" });
  await emitReviewGateProposal(harness);

  let state = harness.getState();
  assert(state && state.reviewGatesProposed === true, "review gates should be proposed before pushback");

  await harness.emit("input", { text: "please change review gates to one final gate" });
  state = harness.getState();
  assert(state && state.reviewGatesProposed === false, "review-gate pushback should force revised proposal");
  assert(Array.isArray(state.reviewGates) && state.reviewGates.length === 0, "review-gate pushback should clear parsed review gates");

  const gateBlockedResult = await harness.emit("input", { text: "pf" });
  assert(
    gateBlockedResult && gateBlockedResult.action === "transform" && gateBlockedResult.text.includes("Proposed Review Gates"),
    "pf input should require review-gate proposal before approval"
  );
}

async function testBranchPolicyEnforcement() {
  const harness = createHarness(true, "main");
  installApprovalGate(harness.pi);

  await harness.emit("session_start", {});
  await harness.emit("input", { text: "/skill:planforge" });

  const beforeStart = await harness.emit("before_agent_start", { systemPrompt: "SYSTEM" });
  assert(
    typeof beforeStart?.systemPrompt === "string" && beforeStart.systemPrompt.includes("Current branch is 'main'") && beforeStart.systemPrompt.includes("After scope approval and before implementation edits"),
    "branch hygiene should be surfaced before the first blocked edit on trunk"
  );

  await emitReviewGateProposal(harness);
  await harness.runCommand("pf", {});

  let blockedEdit = await harness.emit("tool_call", { toolName: "edit", input: { path: "README.md" } });
  assert(blockedEdit && blockedEdit.block === true, "edits on trunk should be blocked after approval");
  assert(String(blockedEdit.reason).includes("branch policy") && String(blockedEdit.reason).includes("main"), "branch policy block should explain trunk enforcement");

  const allowedBranchCreate = await harness.emit("tool_call", {
    toolName: "bash",
    input: { command: "git switch -c feat/test-branch" },
  });
  assert(allowedBranchCreate === undefined, "branch bootstrap command should be allowed on trunk");

  process.env.PLANFORGE_TEST_CURRENT_BRANCH = "feat/test-branch";
  const allowedEdit = await harness.emit("tool_call", { toolName: "edit", input: { path: "README.md" } });
  assert(allowedEdit === undefined, "edits should proceed after switching to a task branch");
}

async function testCloseoutLaneBehavior() {
  const harness = createHarness();
  installApprovalGate(harness.pi);

  await harness.emit("session_start", {});
  await harness.emit("input", { text: "/skill:planforge" });
  await emitReviewGateProposalWithCloseout(harness);

  await harness.runCommand("pf", {});
  let state = harness.getState();
  assert(state && state.approved === true, "closeout plan should still require and accept initial approval");
  assert(state.closeoutDeclared === true, "closeout scope should be parsed from the plan");

  await harness.emit("message_end", {
    message: {
      role: "assistant",
      content: [{ type: "text", text: "REVIEW_GATE_REACHED: RG1\nVerified vs unverified\nEvidence\n- build pass\n- smoke pass\n- negative-path pass" }],
    },
  });

  await harness.runCommand("pf", {});
  state = harness.getState();
  assert(state.approved === true, "accepting the final review gate should approve the next scope");
  assert(state.closeoutActive === true, "final review acceptance should enter closeout scope when declared");
  assert(state.scopeKind === "closeout", "scope kind should record closeout activation");

  await harness.emit("input", { text: "prepare the PR body, run make docs, and push it" });
  state = harness.getState();
  assert(state.approved === true, "minor closeout follow-up should not invalidate approval");
  assert(state.scopeKind === "closeout", "closeout follow-up should stay inside closeout scope");

  const allowedCloseoutBash = await harness.emit("tool_call", {
    toolName: "bash",
    input: { command: "make docs && git push origin HEAD && gh pr create --draft" },
  });
  assert(allowedCloseoutBash === undefined, "declared closeout commands should be allowed inside closeout scope");

  const blockedSourceEdit = await harness.emit("tool_call", {
    toolName: "edit",
    input: { path: "extensions/planforge-approval-gate.ts" },
  });
  assert(blockedSourceEdit && blockedSourceEdit.block === true, "source edits should be blocked inside closeout scope");
  state = harness.getState();
  assert(state.approved === false, "blocked source edit should invalidate closeout approval");
  assert(state.scopeKind === "replan", "blocked source edit should force replanning");
}

async function testHeadlessContinueBehavior() {
  const harness = createHarness(false);
  installApprovalGate(harness.pi);

  await harness.emit("session_start", {});
  await harness.emit("input", { text: "/skill:planforge" });

  await harness.runCommand("pf", {});
  let state = harness.getState();
  assert(state && state.approved === false, "headless pf should not approve before review gates are proposed");
  assert(
    harness.getSentUserMessages().some((m) => String(m).includes("Proposed Review Gates")),
    "missing review-gate proposal should trigger guidance message"
  );

  await emitReviewGateProposal(harness);
  await harness.runCommand("pf", {});
  state = harness.getState();
  assert(state && state.approved === true, "headless pf should approve after review gates are proposed");
  assert(state.reviewGatesApproved === true, "approval should also mark review gates approved");
  const scopeV1 = state.scopeVersion;

  await harness.emit("tool_call", { toolName: "edit", input: { path: "README.md" } });
  state = harness.getState();
  assert(state.approved === true && state.acceptanceState === "accepted", "mutation should keep approval active before review gate");

  await harness.emit("message_end", {
    message: {
      role: "assistant",
      content: [{ type: "text", text: "REVIEW_GATE_REACHED: G1\nEvidence\nVerified vs unverified\n- build\n- smoke\n- negative path" }],
    },
  });
  state = harness.getState();
  assert(state.approved === false && state.acceptanceState === "awaiting", "review packet should open review gate and pause mutation");

  await harness.runCommand("pf", {});
  state = harness.getState();
  assert(state.acceptanceState === "accepted", "headless pf should acknowledge acceptance");
  assert(state.approved === true, "headless pf should auto-approve next scope in one command");
  assert(state.scopeVersion === scopeV1 + 1, "headless pf should advance scope after acceptance");

  const inputResult = await harness.emit("input", { text: "pf" });
  assert(inputResult && inputResult.action === "transform", "plain pf input should transform into a continuation prompt");
  assert(
    inputResult.text.includes("Review gates: RG1") && inputResult.text.includes("Next review gate: none"),
    "continuation prompt should surface approved review gates and next gate"
  );
}

(async () => {
  await testInactiveStatusIsHiddenUntilPlanforgeStarts();
  await testInvestigateModeIsReadOnly();
  await testCheckpointLifecycle();
  await testNaturalLanguageAcceptanceAndScopeReplan();
  await testBenchmarkProfile();
  await testCompactPlanningGuidanceInjected();
  await testReviewGatePushbackFlow();
  await testBranchPolicyEnforcement();
  await testCloseoutLaneBehavior();
  await testHeadlessContinueBehavior();
  console.log("approval gate behavior test: PASS");
})().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
NODE
