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

  const blockedPreApprovalMetaBash = await harness.emit("tool_call", {
    toolName: "bash",
    input: { command: "ls > /tmp/planforge-pre-approval" },
  });
  assert(
    blockedPreApprovalMetaBash && blockedPreApprovalMetaBash.block === true,
    "pre-approval redirection bypass attempts must be blocked"
  );

  await harness.runCommand("pf-continue", {});

  let state = harness.getState();
  assert(state && state.approved === true, "pf-continue should approve current checkpoint");
  assert(state.approvalConsumed === false, "approval should start unconsumed");
  const scopeV1 = state.scopeVersion;

  await harness.emit("tool_call", { toolName: "bash", input: { command: "ls" } });
  state = harness.getState();
  assert(state.approvalConsumed === false, "read-only commands must not consume approval");

  const firstMutation = await harness.emit("tool_call", { toolName: "edit", input: { path: "README.md" } });
  assert(firstMutation === undefined, "first mutation after approval should be allowed");

  state = harness.getState();
  assert(state.approvalConsumed === true, "first mutation should consume checkpoint approval");
  assert(state.acceptanceState === "awaiting", "after mutation, scenario should await user acceptance");

  await harness.runCommand("pf-continue", {});
  state = harness.getState();
  assert(state.acceptanceState === "accepted", "pf-continue should first acknowledge scenario acceptance");
  assert(state.scopeVersion === scopeV1, "acceptance ack should not increment scope version");

  await harness.emit("before_agent_start", { systemPrompt: "SYSTEM" });
  state = harness.getState();
  assert(state.approved === false, "consumed approval should expire before the next agent start");
  assert(state.approvalConsumed === false, "approvalConsumed should reset after expiry");

  await harness.runCommand("pf-continue", {});
  state = harness.getState();
  assert(state.approved === true && state.approvalConsumed === false, "pf-continue should approve next checkpoint after acceptance");
  assert(state.scopeVersion === scopeV1 + 1, "next checkpoint approval should increment scope version");

  await harness.emit("tool_call", { toolName: "edit", input: { path: "docs/pi.md" } });
  state = harness.getState();
  assert(state.approvalConsumed === true, "second checkpoint should become consumed on first mutation");
  assert(state.acceptanceState === "awaiting", "second mutation should await acceptance again");

  await harness.emit("input", { text: "needs changes" });
  state = harness.getState();
  assert(state.acceptanceState === "revise_requested", "pushback should mark scenario revision requested");
  assert(state.approved === false, "pushback should clear approval for further mutation");

  await harness.runCommand("pf-continue", {});
  state = harness.getState();
  assert(state.acceptanceState === "accepted", "pf-continue should accept revised scenario once user is satisfied");
  assert(state.approved === false, "accepting scenario alone should not auto-approve mutation in this state");

  await harness.runCommand("pf-continue", {});
  state = harness.getState();
  assert(state.approved === true, "a second pf-continue should approve the next checkpoint after acceptance");

  const blockedWithoutApproval = await harness.emit("tool_call", { toolName: "edit", input: { path: "README.md" } });
  assert(blockedWithoutApproval === undefined, "mutation should be allowed after new checkpoint approval");
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

  await harness.runCommand("pf-benchmark", { raw: "off" });
  state = harness.getState();
  assert(state && state.benchmarkMode === false, "pf-benchmark off should disable benchmark profile");

  beforeStart = await harness.emit("before_agent_start", { systemPrompt: "SYSTEM" });
  assert(
    beforeStart === undefined ||
      (typeof beforeStart?.systemPrompt === "string" &&
        !beforeStart.systemPrompt.includes("[Planforge benchmark profile]")),
    "benchmark profile guidance should be omitted when disabled"
  );

  await harness.emit("input", { text: "/pf-benchmark on" });
  state = harness.getState();
  assert(state && state.benchmarkMode === true, "input command /pf-benchmark on should enable benchmark profile");
}

async function testHeadlessContinueBehavior() {
  const harness = createHarness(false);
  installApprovalGate(harness.pi);

  await harness.emit("session_start", {});
  await harness.emit("input", { text: "/skill:planforge" });

  await harness.runCommand("pf-continue", {});
  let state = harness.getState();
  assert(state && state.approved === true, "headless pf-continue should approve current checkpoint");
  assert(harness.getSentUserMessages().length >= 1, "pf-continue command should auto-trigger a continuation message when approved");
  const scopeV1 = state.scopeVersion;

  await harness.emit("tool_call", { toolName: "edit", input: { path: "README.md" } });
  state = harness.getState();
  assert(state.approvalConsumed === true && state.acceptanceState === "awaiting", "mutation should consume approval and await acceptance");

  await harness.runCommand("pf-continue", {});
  state = harness.getState();
  assert(state.acceptanceState === "accepted", "headless continue should acknowledge acceptance");
  assert(state.approved === true && state.approvalConsumed === false, "headless continue should auto-approve next checkpoint in one command");
  assert(state.scopeVersion === scopeV1 + 1, "headless continue should advance scope after acceptance");

  const inputResult = await harness.emit("input", { text: "pf-continue" });
  assert(inputResult && inputResult.action === "transform", "plain pf-continue input should transform into a continuation prompt");
}

(async () => {
  await testInvestigateModeIsReadOnly();
  await testCheckpointLifecycle();
  await testBenchmarkProfile();
  await testHeadlessContinueBehavior();
  console.log("approval gate behavior test: PASS");
})().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
NODE
