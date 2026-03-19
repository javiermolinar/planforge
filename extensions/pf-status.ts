const GATE_STATE_ENTRY_TYPE = "planforge-approval-gate-state";
const WIDGET_KEY = "planforge-dashboard";

const EXECUTION_MODES = new Set(["auto", "supervised", "fast", "none"]);

function normalizeExecutionMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return EXECUTION_MODES.has(normalized) ? normalized : "auto";
}

const ACCEPTANCE_STATES = new Set(["none", "awaiting", "accepted", "revise_requested"]);

function normalizeAcceptanceState(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ACCEPTANCE_STATES.has(normalized) ? normalized : "none";
}

const DEFAULT_GATE_STATE = {
  enabled: false,
  approved: false,
  approvalConsumed: false,
  scopeVersion: 0,
  executionMode: "auto",
  acceptanceState: "none",
  benchmarkMode: false,
  reviewGatesProposed: false,
  reviewGatesApproved: false,
  reviewGates: [],
  reviewGateCursor: 0,
  currentReviewGateId: "",
  acceptedReviewGates: [],
};

function normalizeGateState(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_GATE_STATE };
  const scopeVersion = Number.isFinite(raw.scopeVersion) ? Number(raw.scopeVersion) : 0;

  return {
    enabled: Boolean(raw.enabled),
    approved: Boolean(raw.approved),
    approvalConsumed: Boolean(raw.approvalConsumed),
    scopeVersion: Math.max(0, scopeVersion),
    executionMode: normalizeExecutionMode(raw.executionMode),
    acceptanceState: normalizeAcceptanceState(raw.acceptanceState),
    benchmarkMode: Boolean(raw.benchmarkMode),
    reviewGatesProposed: Boolean(raw.reviewGatesProposed),
    reviewGatesApproved: Boolean(raw.reviewGatesApproved),
    reviewGates: Array.isArray(raw.reviewGates)
      ? raw.reviewGates.map((gate, index) => ({
          id: String(gate?.id || `G${index + 1}`),
          trigger: String(gate?.trigger || ""),
          requiredEvidence: String(gate?.requiredEvidence || ""),
        }))
      : [],
    reviewGateCursor: Number.isFinite(raw.reviewGateCursor) ? Math.max(0, Number(raw.reviewGateCursor)) : 0,
    currentReviewGateId: String(raw.currentReviewGateId || ""),
    acceptedReviewGates: Array.isArray(raw.acceptedReviewGates)
      ? raw.acceptedReviewGates.map((id) => String(id || "")).filter(Boolean)
      : [],
  };
}

function resolveNextReviewGate(state) {
  const gates = Array.isArray(state.reviewGates) ? state.reviewGates : [];
  const accepted = new Set(Array.isArray(state.acceptedReviewGates) ? state.acceptedReviewGates : []);
  const start = Math.max(0, Number(state.reviewGateCursor) || 0);
  for (let i = start; i < gates.length; i++) {
    if (!accepted.has(gates[i].id)) return gates[i];
  }
  for (let i = 0; i < start; i++) {
    if (!accepted.has(gates[i].id)) return gates[i];
  }
  return null;
}

function gateStatusLine(state) {
  const mode = normalizeExecutionMode(state.executionMode);
  const modeLabel = mode === "auto" ? "" : `, mode ${mode}`;
  const profileLabel = state.benchmarkMode ? ", benchmark" : "";
  const gateCount = Array.isArray(state.reviewGates) ? state.reviewGates.length : 0;
  const nextGate = resolveNextReviewGate(state);
  const reviewLabel = state.reviewGatesProposed
    ? state.reviewGatesApproved
      ? `, review-gates approved (${gateCount})`
      : `, review-gates proposed (${gateCount})`
    : ", review-gates missing";
  const reviewNextLabel = nextGate ? `, next ${nextGate.id}` : "";
  const acceptanceState = normalizeAcceptanceState(state.acceptanceState);
  if (mode === "none") return `PF gate: investigate read-only${modeLabel}${profileLabel}${reviewLabel}${reviewNextLabel}`;
  if (!state.enabled) return `PF gate: off${modeLabel}${profileLabel}${reviewLabel}${reviewNextLabel}`;
  if (acceptanceState === "awaiting") {
    return `PF gate: awaiting scenario acceptance (scope v${Math.max(1, state.scopeVersion || 1)}${modeLabel}${profileLabel}${reviewLabel}${reviewNextLabel})`;
  }
  if (acceptanceState === "revise_requested") {
    return `PF gate: revision requested (scope v${Math.max(1, state.scopeVersion || 1)}${modeLabel}${profileLabel}${reviewLabel}${reviewNextLabel})`;
  }
  if (state.approved && state.approvalConsumed) {
    return `PF gate: checkpoint used (scope v${state.scopeVersion}${modeLabel}${profileLabel}${reviewLabel}${reviewNextLabel}), awaiting /pf`;
  }
  if (state.approved) return `PF gate: approved (scope v${state.scopeVersion}${modeLabel}${profileLabel}${reviewLabel}${reviewNextLabel})`;
  return `PF gate: waiting approval (scope v${state.scopeVersion}${modeLabel}${profileLabel}${reviewLabel}${reviewNextLabel})`;
}

function buildStatusLines(gateState) {
  const now = new Date().toISOString();
  const lines = [
    "Planforge status",
    "",
    `State: ${gateStatusLine(gateState)}`,
    `Execution mode: ${normalizeExecutionMode(gateState.executionMode)}`,
    `Benchmark profile: ${gateState.benchmarkMode ? "on" : "off"}`,
    `Review gates proposed: ${gateState.reviewGatesProposed ? "yes" : "no"}`,
    `Review gates approved: ${gateState.reviewGatesApproved ? "yes" : "no"}`,
    `Review gate count: ${Array.isArray(gateState.reviewGates) ? gateState.reviewGates.length : 0}`,
    `Scope version: v${Math.max(1, gateState.scopeVersion || 1)}`,
    `Scenario acceptance: ${normalizeAcceptanceState(gateState.acceptanceState)}`,
    `Updated: ${now}`,
    "",
  ];

  const gates = Array.isArray(gateState.reviewGates) ? gateState.reviewGates : [];
  const accepted = new Set(Array.isArray(gateState.acceptedReviewGates) ? gateState.acceptedReviewGates : []);

  lines.push("Review gates:");
  if (gates.length === 0) {
    lines.push("- (none parsed)");
  } else {
    const awaitingId = String(gateState.currentReviewGateId || "");
    const nextGate = resolveNextReviewGate(gateState);
    for (const gate of gates) {
      let status = "pending";
      if (accepted.has(gate.id)) status = "accepted";
      else if (awaitingId && awaitingId === gate.id && normalizeAcceptanceState(gateState.acceptanceState) === "awaiting") status = "awaiting";
      else if (nextGate && nextGate.id === gate.id) status = "next";
      lines.push(`- [${status}] ${gate.id}: ${gate.trigger || "(no trigger)"}`);
      if (gate.requiredEvidence) lines.push(`    evidence: ${gate.requiredEvidence}`);
    }
  }

  lines.push(
    "",
    "Commands:",
    "- /pf (accept current scenario or approve next supervised mutating scope)",
    "- /pf benchmark [on|off] (toggle benchmark profile constraints)",
    "- /pf status (open this panel)",
    "",
    "In supervised flow, /pf approves mutation scope and is re-used at review gates.",
    "If a review gate is awaiting acceptance, /pf marks it accepted (and may approve next scope).",
    "",
    "Task checklist commands were removed.",
    "Use the rolling plan file for task tracking.",
    "",
    "Esc / Enter / q to close this panel"
  );

  return lines;
}

function clamp(line, width) {
  const w = Math.max(0, Number(width) || 0);
  if (w <= 0) return "";
  const text = String(line || "");
  if (text.length <= w) return text;
  if (w === 1) return "…";
  return `${text.slice(0, w - 1)}…`;
}

function buildOverlayComponent(tui, linesBuilder, done) {
  let cachedWidth;
  let cachedLines;

  function renderFrame(width) {
    const panelWidth = Math.max(24, width || 24);
    const inner = Math.max(20, panelWidth - 2);
    const body = linesBuilder();

    const lines = [];
    lines.push(`┌${"─".repeat(inner)}┐`);
    for (const line of body) {
      const trimmed = clamp(line, inner);
      const padding = inner - trimmed.length;
      lines.push(`│${trimmed}${" ".repeat(Math.max(0, padding))}│`);
    }
    lines.push(`└${"─".repeat(inner)}┘`);
    return lines;
  }

  return {
    render(width) {
      if (cachedLines && cachedWidth === width) return cachedLines;
      cachedLines = renderFrame(width);
      cachedWidth = width;
      return cachedLines;
    },
    invalidate() {
      cachedWidth = undefined;
      cachedLines = undefined;
    },
    handleInput(data) {
      const key = String(data || "");
      if (key === "q" || key === "Q" || key === "\u001b" || key === "\r" || key === "\n" || key === "\u0003") {
        done(null);
        return;
      }

      if (key === "r" || key === "R") {
        cachedWidth = undefined;
        cachedLines = undefined;
        tui.requestRender();
      }
    },
  };
}

export default function (pi) {
  let gateState = { ...DEFAULT_GATE_STATE };

  function clearWidget(ctx) {
    if (!ctx?.hasUI) return;
    ctx.ui.setWidget(WIDGET_KEY, undefined);
  }

  function syncFromSession(ctx) {
    const branch = ctx?.sessionManager?.getBranch?.() || [];
    let restoredGate = null;

    for (const entry of branch) {
      if (entry?.type !== "custom") continue;
      if (entry?.customType === GATE_STATE_ENTRY_TYPE) restoredGate = entry?.data;
    }

    gateState = restoredGate ? normalizeGateState(restoredGate) : { ...DEFAULT_GATE_STATE };
    clearWidget(ctx);
  }

  async function openOverlay(ctx) {
    if (!ctx?.hasUI) return;
    syncFromSession(ctx);

    await ctx.ui.custom(
      (tui, _theme, _keybindings, done) => buildOverlayComponent(tui, () => buildStatusLines(gateState), done),
      {
        overlay: true,
        overlayOptions: {
          anchor: "right-center",
          width: "46%",
          minWidth: 44,
          maxWidth: 84,
          maxHeight: "85%",
          margin: 1,
        },
      }
    );

    clearWidget(ctx);
  }

  pi.on("session_start", async (_event, ctx) => {
    syncFromSession(ctx);
  });

  pi.on("session_switch", async (_event, ctx) => {
    syncFromSession(ctx);
  });

  pi.registerCommand("pf-status", {
    description: "Show Planforge status overlay",
    handler: async (_args, ctx) => {
      await openOverlay(ctx);
    },
  });

}
