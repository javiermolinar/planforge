const GATE_STATE_ENTRY_TYPE = "planforge-approval-gate-state";
const WIDGET_KEY = "planforge-dashboard";

const EXECUTION_MODES = new Set(["auto", "supervised", "fast"]);

function normalizeExecutionMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return EXECUTION_MODES.has(normalized) ? normalized : "auto";
}

const DEFAULT_GATE_STATE = {
  enabled: false,
  approved: false,
  scopeVersion: 0,
  executionMode: "auto",
};

function normalizeGateState(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_GATE_STATE };
  const scopeVersion = Number.isFinite(raw.scopeVersion) ? Number(raw.scopeVersion) : 0;

  return {
    enabled: Boolean(raw.enabled),
    approved: Boolean(raw.approved),
    scopeVersion: Math.max(0, scopeVersion),
    executionMode: normalizeExecutionMode(raw.executionMode),
  };
}

function gateStatusLine(state) {
  const mode = normalizeExecutionMode(state.executionMode);
  const modeLabel = mode === "auto" ? "" : `, mode ${mode}`;
  if (!state.enabled) return `PF gate: off${modeLabel}`;
  if (state.approved) return `PF gate: approved (scope v${state.scopeVersion}${modeLabel})`;
  return `PF gate: waiting approval (scope v${state.scopeVersion}${modeLabel})`;
}

function buildStatusLines(gateState) {
  const now = new Date().toISOString();

  return [
    "Planforge status",
    "",
    `State: ${gateStatusLine(gateState)}`,
    `Execution mode: ${normalizeExecutionMode(gateState.executionMode)}`,
    `Scope version: v${Math.max(1, gateState.scopeVersion || 1)}`,
    `Updated: ${now}`,
    "",
    "Commands:",
    "- /pf-continue (approve current supervised scope)",
    "- /pf-status (open this panel)",
    "",
    "Task checklist commands were removed.",
    "Use the rolling plan file for task tracking.",
    "",
    "Esc / Enter / q to close this panel",
  ];
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

  // Backward-compatible alias.
  pi.registerCommand("pf-overlay", {
    description: "Alias for /pf-status",
    handler: async (_args, ctx) => {
      await openOverlay(ctx);
    },
  });
}
