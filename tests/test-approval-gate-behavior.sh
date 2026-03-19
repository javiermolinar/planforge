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

function createHarness(hasUI = true) {
  const handlers = new Map();
  const commands = new Map();
  const branch = [];
  const sentUserMessages = [];

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
      notify() {},
      setStatus() {},
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

  return { pi, emit, runCommand, getState, getSentUserMessages };
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

  const blockedPipeBash = await harness.emit("tool_call", {
    toolName: "bash",
    input: { command: "git status | wc -l" },
  });
  assert(blockedPipeBash && blockedPipeBash.block === true, "pipe-based commands must be blocked in investigate mode");

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

  const blockedPreApprovalMetaBash = await harness.emit("tool_call", {
    toolName: "bash",
    input: { command: "ls > /tmp/planforge-pre-approval" },
  });
  assert(
    blockedPreApprovalMetaBash && blockedPreApprovalMetaBash.block === true,
    "pre-approval redirection bypass attempts must be blocked"
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

  await harness.runCommand("pf", {});
  state = harness.getState();
  assert(state.acceptanceState === "accepted", "pf should accept review gate");
  assert(state.approved === true, "pf should also approve next scope after review gate");
  assert(state.scopeVersion === scopeV1 + 1, "next scope should be advanced after accepted review gate");
  assert(Array.isArray(state.acceptedReviewGates) && state.acceptedReviewGates.length >= 1, "accepted review gates should be tracked");

  await harness.emit("tool_call", { toolName: "edit", input: { path: "docs/pi.md" } });
  state = harness.getState();
  assert(state.approved === true, "next mutation should be allowed after one continue");

  await harness.emit("input", { text: "needs changes" });
  state = harness.getState();
  assert(state.acceptanceState === "revise_requested", "pushback should mark scenario revision requested");
  assert(state.approved === false, "pushback should clear approval for further mutation");

  await harness.runCommand("pf", {});
  state = harness.getState();
  assert(state.acceptanceState === "accepted", "pf should accept revised scenario once user is satisfied");
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
}

(async () => {
  await testInvestigateModeIsReadOnly();
  await testCheckpointLifecycle();
  await testBenchmarkProfile();
  await testReviewGatePushbackFlow();
  await testHeadlessContinueBehavior();
  console.log("approval gate behavior test: PASS");
})().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
NODE
