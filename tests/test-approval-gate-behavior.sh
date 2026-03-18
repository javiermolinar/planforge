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

function createHarness() {
  const handlers = new Map();
  const commands = new Map();
  const branch = [];

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
  };

  const ctx = {
    hasUI: true,
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

  return { pi, emit, runCommand, getState };
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

  await harness.runCommand("pf-continue", {});
  state = harness.getState();
  assert(state.approved === true && state.approvalConsumed === false, "pf-continue should approve next checkpoint");
  assert(state.scopeVersion === scopeV1 + 1, "next checkpoint approval should increment scope version");
  const scopeV2 = state.scopeVersion;

  await harness.runCommand("pf-continue", {});
  state = harness.getState();
  assert(state.scopeVersion === scopeV2, "pf-continue should not increment scope while current checkpoint is still unused");

  await harness.emit("tool_call", { toolName: "edit", input: { path: "docs/pi.md" } });
  state = harness.getState();
  assert(state.approvalConsumed === true, "second checkpoint should also become consumed on first mutation");

  await harness.emit("before_agent_start", { systemPrompt: "SYSTEM" });
  state = harness.getState();
  assert(state.approved === false, "consumed approval should expire before the next agent start");
  assert(state.approvalConsumed === false, "approvalConsumed should reset after expiry");

  const blockedWithoutApproval = await harness.emit("tool_call", { toolName: "edit", input: { path: "README.md" } });
  assert(blockedWithoutApproval && blockedWithoutApproval.block === true, "mutation should be blocked once approval expires");
}

(async () => {
  await testInvestigateModeIsReadOnly();
  await testCheckpointLifecycle();
  console.log("approval gate behavior test: PASS");
})().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
NODE
