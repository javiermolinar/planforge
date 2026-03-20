let gateShared;
try {
  gateShared = require("../lib/planforge-gate-shared.js");
} catch {
  gateShared = require("./lib/planforge-gate-shared.js");
}

const {
  normalizeExecutionMode,
  normalizeAcceptanceState,
  resolveNextReviewGate: resolveNextReviewGateBase,
  summarizeReviewGates,
  nextReviewGateLabel,
  isPlanforgeActive,
  gateStatusLine: statusLine,
} = gateShared;

const STATE_ENTRY_TYPE = "planforge-approval-gate-state";

const STATUS_KEY = "planforge-gate";

function inferBenchmarkModeFromInput(text) {
  return BENCHMARK_HINT.test(String(text || ""));
}

function parseBenchmarkToggle(value, fallback) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return fallback;
  if (normalized === "on" || normalized === "enable" || normalized === "true" || normalized === "1") return true;
  if (normalized === "off" || normalized === "disable" || normalized === "false" || normalized === "0") return false;
  return fallback;
}

function parsePfArgs(rawArgs) {
  const raw = String(rawArgs || "").trim();
  if (!raw) return { type: "advance" };

  const tokens = raw.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { type: "advance" };

  const [first, second] = tokens;
  const sub = String(first || "").toLowerCase();

  if (sub === "benchmark") {
    return { type: "benchmark", value: String(second || "") };
  }

  if (sub === "status") {
    return { type: "status" };
  }

  const benchmarkDirect = parseBenchmarkToggle(sub, null);
  if (benchmarkDirect !== null) {
    return { type: "benchmark", value: sub };
  }

  if (sub === "go" || sub === "continue" || sub === "approve" || sub === "open") {
    return { type: "advance" };
  }

  return { type: "unknown", raw };
}

function extractAssistantText(message) {
  if (!message || message.role !== "assistant" || !Array.isArray(message.content)) return "";
  return message.content
    .filter((part) => part && part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
}

function hasReviewGateProposal(text) {
  const normalized = String(text || "");
  return REVIEW_GATES_SECTION_HINT.test(normalized) || REVIEW_GATES_TABLE_HINT.test(normalized);
}

function hasReviewPacket(text) {
  const normalized = String(text || "");
  return REVIEW_PACKET_HINT.test(normalized) && REVIEW_PACKET_EVIDENCE_HINT.test(normalized);
}

function splitMarkdownRow(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed.startsWith("|")) return null;
  const inner = trimmed.slice(1, trimmed.endsWith("|") ? -1 : undefined);
  return inner.split("|").map((cell) => cell.trim());
}

function isSeparatorRow(cells) {
  return Array.isArray(cells) && cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(String(cell || "").trim()));
}

function normalizeGateId(value, fallbackIndex) {
  const raw = String(value || "").trim();
  if (!raw) return `G${fallbackIndex + 1}`;
  const cleaned = raw.replace(/[^a-zA-Z0-9_.:-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cleaned || `G${fallbackIndex + 1}`;
}

function parseReviewGates(text) {
  const normalized = String(text || "");
  const sectionMatch = normalized.match(REVIEW_GATES_SECTION_HINT);
  if (!sectionMatch || sectionMatch.index == null) return [];

  const sectionText = normalized.slice(sectionMatch.index);
  const lines = sectionText.split(/\r?\n/);
  let headerIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const cells = splitMarkdownRow(lines[i]);
    if (!cells || cells.length < 3) continue;
    if (/gate\s*id/i.test(cells[0]) && /trigger/i.test(cells[1]) && /required\s*evidence/i.test(cells[2])) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex < 0) return [];

  let rowStart = headerIndex + 1;
  const sepCells = splitMarkdownRow(lines[rowStart]);
  if (isSeparatorRow(sepCells)) rowStart += 1;

  const gates = [];
  const seen = new Set();

  for (let i = rowStart; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = String(line || "").trim();
    if (!trimmed) {
      if (gates.length > 0) break;
      continue;
    }

    const cells = splitMarkdownRow(trimmed);
    if (!cells || cells.length < 3) {
      if (gates.length > 0) break;
      continue;
    }

    if (isSeparatorRow(cells)) continue;

    const gateId = normalizeGateId(cells[0], gates.length);
    if (seen.has(gateId)) continue;

    const trigger = String(cells[1] || "").trim();
    const requiredEvidence = String(cells[2] || "").trim();
    const why = String(cells[3] || "").trim();

    if (!trigger && !requiredEvidence && !why) continue;

    gates.push({
      id: gateId,
      trigger,
      requiredEvidence,
      why,
    });
    seen.add(gateId);
  }

  return gates;
}

function extractReachedReviewGateId(text) {
  const normalized = String(text || "");
  const match = normalized.match(/REVIEW_GATE_REACHED\s*:\s*([a-zA-Z0-9_.:-]+)/i);
  if (!match) return "";
  return normalizeGateId(match[1], 0);
}

const DEFAULT_STATE = {
  enabled: false,
  approved: false,
  scopeVersion: 0,
  executionMode: "auto",
  acceptanceState: "none",
  pendingScopeAdvance: false,
  benchmarkMode: false,
  reviewGatesProposed: false,
  reviewGatesApproved: false,
  reviewGates: [],
  reviewGateCursor: 0,
  currentReviewGateId: "",
  acceptedReviewGates: [],
  updatedAt: 0,
  lastReason: "init",
};

const PF_COMMAND = /^\s*\/?pf(?:\s+(.+?))?\s*[.!]*\s*$/i;
const REQUEST_REVISION = /^\s*(needs? changes?|revise|not right|fix this)\s*[.!]*\s*$/i;
const TRIVIAL_ACK =
  /^\s*(ok|okay|k|thanks|thank you|got it|roger|understood|sounds good|great|nice|pf)\s*[.!]*\s*$/i;

const PLANFORGE_SUPERVISED_SKILL_CMD = /^\s*\/skill:planforge\b/i;
const PLANFORGE_FAST_SKILL_CMD = /^\s*\/skill:planforge-fast\b/i;
const PLANFORGE_INVESTIGATE_SKILL_CMD = /^\s*\/skill:forge-investigate\b/i;
const FORGE_SKILL_CMD = /^\s*\/skill:forge-[a-z0-9-]+\b/i;
const CONTROL_COMMAND = /^\s*\/[a-z0-9:-]+\b/i;
const BENCHMARK_HINT = /\b(benchmark|scorecard|evaluation|leaderboard)\b/i;
const REVIEW_GATES_SECTION_HINT = /##\s*Proposed\s*Review\s*Gates/i;
const REVIEW_GATES_TABLE_HINT = /\|\s*Gate\s*ID\s*\|\s*Trigger\s*\|\s*Required\s*evidence\s*\|/i;
const REVIEW_GATES_PUSHBACK_HINT = /\b(review\s+gate|gates?)\b.*\b(change|revise|remove|drop|adjust|one|single|final|only)\b|\b(change|revise|remove|drop|adjust)\b.*\b(review\s+gate|gates?)\b/i;
const REVIEW_PACKET_HINT = /\bverified\s+vs\s+unverified\b/i;
const REVIEW_PACKET_EVIDENCE_HINT = /\bevidence\b|\bbuild\b|\bsmoke\b|\bnegative[- ]path\b/i;

function scanShell(command, visitor) {
  const text = String(command || "");
  let quote = "";
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1] || "";

    if (escaped) {
      escaped = false;
      visitor(ch, i, { quote, escaped: true, next });
      continue;
    }

    if (ch === "\\" && quote !== "'") {
      escaped = true;
      visitor(ch, i, { quote, escaped: false, next });
      continue;
    }

    if (quote) {
      if (ch === quote) quote = "";
      visitor(ch, i, { quote, escaped: false, next });
      continue;
    }

    if (ch === "'" || ch === '"') {
      quote = ch;
      visitor(ch, i, { quote: "", escaped: false, next });
      continue;
    }

    visitor(ch, i, { quote: "", escaped: false, next });
  }

  return { unclosedQuote: Boolean(quote), trailingEscape: escaped };
}

function splitCommandSegments(command) {
  const segments = [];
  let start = 0;

  scanShell(command, (ch, index, state) => {
    if (state.quote) return;

    if (ch === "\n" || ch === ";") {
      const segment = String(command || "").slice(start, index).trim();
      if (segment) segments.push(segment);
      start = index + 1;
      return;
    }

    if ((ch === "&" && state.next === "&") || (ch === "|" && state.next === "|")) {
      const segment = String(command || "").slice(start, index).trim();
      if (segment) segments.push(segment);
      start = index + 2;
    }
  });

  const tail = String(command || "").slice(start).trim();
  if (tail) segments.push(tail);
  return segments;
}

function tokenizeShellWords(segment) {
  const tokens = [];
  let current = "";

  const flush = () => {
    if (!current) return;
    tokens.push(current);
    current = "";
  };

  const scanResult = scanShell(segment, (ch, _index, state) => {
    if (state.quote) {
      if (ch !== state.quote) current += ch;
      return;
    }

    if (ch === "'" || ch === '"') {
      return;
    }

    if (/\s/.test(ch)) {
      flush();
      return;
    }

    current += ch;
  });

  if (scanResult.unclosedQuote || scanResult.trailingEscape) return null;
  flush();
  return tokens;
}

function hasBlockedShellMeta(segment) {
  let blocked = false;
  const scanResult = scanShell(segment, (ch, _index, state) => {
    if (state.quote || blocked) return;
    if (ch === "<" || ch === ">" || ch === "`") {
      blocked = true;
      return;
    }
    if (ch === "$" && state.next === "(") {
      blocked = true;
      return;
    }
    if (ch === "|" && state.next !== "|") {
      blocked = true;
      return;
    }
    if (ch === "&" && state.next !== "&") {
      blocked = true;
    }
  });

  return blocked || scanResult.unclosedQuote || scanResult.trailingEscape;
}

function isAllowedPreApprovalSegment(segment) {
  const trimmed = String(segment || "").trim();
  if (!trimmed) return true;
  if (hasBlockedShellMeta(trimmed)) return false;

  const tokens = tokenizeShellWords(trimmed);
  if (!tokens || tokens.length === 0) return true;

  const [cmd, subcmd, third] = tokens;

  if (cmd === "ls" || cmd === "rg" || cmd === "find" || cmd === "pwd") {
    return true;
  }

  if (cmd === "git" && subcmd === "status") {
    return true;
  }

  if (cmd === "git" && subcmd === "branch" && third === "--show-current" && tokens.length === 3) {
    return true;
  }

  return false;
}

function isAllowedPreApprovalBash(command) {
  const trimmed = String(command || "").trim();
  if (!trimmed) return true;

  const segments = splitCommandSegments(trimmed);
  if (segments.length === 0) return true;

  return segments.every((segment) => isAllowedPreApprovalSegment(segment));
}

function isMutatingToolCall(event) {
  const toolName = String(event?.toolName || "");
  const bashCommand = String(event?.input?.command || "");
  return toolName === "edit" || toolName === "write" || (toolName === "bash" && !isAllowedPreApprovalBash(bashCommand));
}

function normalizeState(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE };
  const state = raw;
  const scopeVersion = Number.isFinite(state.scopeVersion) ? Number(state.scopeVersion) : 0;

  return {
    enabled: Boolean(state.enabled),
    approved: Boolean(state.approved),
    scopeVersion: Math.max(0, scopeVersion),
    executionMode: normalizeExecutionMode(state.executionMode),
    acceptanceState: normalizeAcceptanceState(state.acceptanceState),
    pendingScopeAdvance: Boolean(state.pendingScopeAdvance),
    benchmarkMode: Boolean(state.benchmarkMode),
    reviewGatesProposed: Boolean(state.reviewGatesProposed),
    reviewGatesApproved: Boolean(state.reviewGatesApproved),
    reviewGates: Array.isArray(state.reviewGates)
      ? state.reviewGates
          .map((gate, index) => ({
            id: normalizeGateId(gate?.id, index),
            trigger: String(gate?.trigger || "").trim(),
            requiredEvidence: String(gate?.requiredEvidence || "").trim(),
            why: String(gate?.why || "").trim(),
          }))
          .filter((gate) => gate.id)
      : [],
    reviewGateCursor: Number.isFinite(state.reviewGateCursor) ? Math.max(0, Number(state.reviewGateCursor)) : 0,
    currentReviewGateId: String(state.currentReviewGateId || ""),
    acceptedReviewGates: Array.isArray(state.acceptedReviewGates)
      ? state.acceptedReviewGates.map((id, index) => normalizeGateId(id, index)).filter(Boolean)
      : [],
    updatedAt: Number.isFinite(state.updatedAt) ? Number(state.updatedAt) : 0,
    lastReason: typeof state.lastReason === "string" ? state.lastReason : "restored",
  };
}

function resolveNextReviewGate(state) {
  const gate = resolveNextReviewGateBase(state);
  if (!gate) return { gate: null, index: -1 };
  const index = Array.isArray(state?.reviewGates) ? state.reviewGates.findIndex((candidate) => candidate.id === gate.id) : -1;
  return { gate, index };
}

function buildContinuationMessage(gateState) {
  const scope = Math.max(1, gateState?.scopeVersion || 1);
  return `Continue with the approved checkpoint. Scope v${scope} is approved. Review gates: ${summarizeReviewGates(gateState)}. Next review gate: ${nextReviewGateLabel(gateState)}. Execute only currently approved work and report evidence.`;
}

function buildPreApprovalGateHint(gateState) {
  if (!gateState?.reviewGatesProposed || !Array.isArray(gateState?.reviewGates) || gateState.reviewGates.length === 0) {
    return "No review gates parsed yet. Post the Plan Packet with Proposed Review Gates, then use /pf. Use /pf status for details.";
  }
  return `Review gates: ${summarizeReviewGates(gateState)}. Next review gate: ${nextReviewGateLabel(gateState)}. Use /pf status for details.`;
}

function buildMutationBlockReason(gateState, toolName) {
  const scope = Math.max(1, gateState?.scopeVersion || 1);
  return `Planforge gate is waiting approval for scope v${scope}. Blocked ${toolName} until /pf. ${buildPreApprovalGateHint(gateState)}`;
}

function buildBashBlockReason(gateState) {
  const scope = Math.max(1, gateState?.scopeVersion || 1);
  return `Planforge gate is waiting approval for scope v${scope}. Blocked bash command before /pf because it is outside the read-only allowlist. Allowed pre-approval commands: ls, rg, find, git status, git branch --show-current, pwd. ${buildPreApprovalGateHint(gateState)}`;
}

function buildOverlayLines(state) {
  const gates = Array.isArray(state.reviewGates) ? state.reviewGates : [];
  const accepted = new Set(Array.isArray(state.acceptedReviewGates) ? state.acceptedReviewGates : []);
  const nextGate = resolveNextReviewGate(state).gate;
  const lines = [
    "Planforge status",
    "",
    `State: ${statusLine(state)}`,
    `Execution mode: ${normalizeExecutionMode(state.executionMode)}`,
    `Benchmark profile: ${state.benchmarkMode ? "on" : "off"}`,
    `Review gates proposed: ${state.reviewGatesProposed ? "yes" : "no"}`,
    `Review gates approved: ${state.reviewGatesApproved ? "yes" : "no"}`,
    `Scope version: v${Math.max(1, state.scopeVersion || 1)}`,
    `Scenario acceptance: ${normalizeAcceptanceState(state.acceptanceState)}`,
    "",
    "Review gates:",
  ];

  if (gates.length === 0) {
    lines.push("- (none parsed)");
  } else {
    const awaitingId = String(state.currentReviewGateId || "");
    for (const gate of gates) {
      let marker = "pending";
      if (accepted.has(gate.id)) marker = "accepted";
      else if (awaitingId && awaitingId === gate.id && normalizeAcceptanceState(state.acceptanceState) === "awaiting") marker = "awaiting";
      else if (nextGate && nextGate.id === gate.id) marker = "next";
      lines.push(`- [${marker}] ${gate.id}: ${gate.trigger || "(no trigger)"}`);
    }
  }

  lines.push(
    "",
    "Commands:",
    "- /pf",
    "- /pf benchmark [on|off]",
    "- /pf status",
    "",
    "Esc / Enter / q to close"
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
  return {
    render(width) {
      const panelWidth = Math.max(24, width || 24);
      const inner = Math.max(20, panelWidth - 2);
      const body = linesBuilder();
      const lines = [`┌${"─".repeat(inner)}┐`];
      for (const line of body) {
        const trimmed = clamp(line, inner);
        lines.push(`│${trimmed}${" ".repeat(Math.max(0, inner - trimmed.length))}│`);
      }
      lines.push(`└${"─".repeat(inner)}┘`);
      return lines;
    },
    handleInput(data) {
      const key = String(data || "");
      if (key === "q" || key === "Q" || key === "\u001b" || key === "\r" || key === "\n" || key === "\u0003") {
        done(null);
      }
      if (key === "r" || key === "R") {
        tui.requestRender();
      }
    },
  };
}

export default function (pi) {
  let state = { ...DEFAULT_STATE };

  function persist(reason) {
    state = {
      ...state,
      updatedAt: Date.now(),
      lastReason: reason,
    };
    pi.appendEntry(STATE_ENTRY_TYPE, { ...state });
  }

  function render(ctx) {
    if (!ctx?.hasUI) return;
    if (!isPlanforgeActive(state)) {
      ctx.ui.setStatus(STATUS_KEY, undefined);
      return;
    }
    ctx.ui.setStatus(STATUS_KEY, statusLine(state));
  }

  function setState(next, reason, ctx, notifyLevel, notifyMessage) {
    state = normalizeState({ ...state, ...next });
    persist(reason);
    render(ctx);
    if (notifyMessage && ctx?.hasUI) {
      ctx.ui.notify(notifyMessage, notifyLevel || "info");
    }
  }

  async function openStatusOverlay(ctx) {
    if (!isPlanforgeActive(state)) {
      const message = "Planforge is not active in this session. Start with /skill:planforge, /skill:planforge-fast, or /skill:forge-investigate.";
      if (!ctx?.hasUI) {
        pi.sendUserMessage(message);
        return;
      }
      ctx.ui.notify(message, "info");
      return;
    }

    if (!ctx?.hasUI) {
      pi.sendUserMessage(`Planforge status: ${statusLine(state)}`);
      return;
    }

    await ctx.ui.custom(
      (tui, _theme, _keybindings, done) => buildOverlayComponent(tui, () => buildOverlayLines(state), done),
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
  }

  function approveCurrentScope(ctx, reason, notify = true) {
    const baseScope = Math.max(1, state.scopeVersion || 1);
    const scope = state.pendingScopeAdvance ? baseScope + 1 : baseScope;
    setState(
      {
        enabled: true,
        approved: true,
        scopeVersion: scope,
        acceptanceState: "accepted",
        pendingScopeAdvance: false,
        reviewGatesApproved: Boolean(state.reviewGatesProposed),
        currentReviewGateId: "",
      },
      reason,
      ctx,
      notify ? "success" : undefined,
      notify
        ? `Planforge gate approved for scope v${scope}. Review gates: ${summarizeReviewGates(state)}. Next review gate: ${nextReviewGateLabel(state)}.`
        : undefined
    );
  }

  function restore(ctx) {
    const branch = ctx?.sessionManager?.getBranch?.() || [];
    let restored = null;

    for (const entry of branch) {
      if (entry?.type === "custom" && entry?.customType === STATE_ENTRY_TYPE) {
        restored = entry?.data;
      }
    }

    state = restored ? normalizeState(restored) : { ...DEFAULT_STATE };
    render(ctx);
  }

  function invalidateForScopeChange(ctx, reason, message) {
    const nextScope = Math.max(1, state.scopeVersion || 1) + 1;
    setState(
      {
        enabled: true,
        approved: false,
        scopeVersion: nextScope,
        acceptanceState: "none",
        pendingScopeAdvance: false,
        reviewGatesProposed: false,
        reviewGatesApproved: false,
        reviewGates: [],
        reviewGateCursor: 0,
        currentReviewGateId: "",
        acceptedReviewGates: [],
      },
      reason,
      ctx,
      "warning",
      message || "Planforge gate: scope changed. Re-post plan + tests and request explicit approval."
    );
  }

  function handleAccept(ctx) {
    const acceptanceState = normalizeAcceptanceState(state.acceptanceState);
    if (acceptanceState !== "awaiting" && acceptanceState !== "revise_requested") {
      if (ctx?.hasUI) ctx.ui.notify("No scenario is currently awaiting acceptance.", "info");
      return;
    }

    setState(
      {
        acceptanceState: "accepted",
      },
      "scenario-accepted",
      ctx,
      "success",
      "Scenario accepted. Ask for the next checkpoint, then use /pf again to approve mutation."
    );
  }

  function handleRevise(ctx, reason = "scenario-revision-requested") {
    setState(
      {
        acceptanceState: "revise_requested",
        approved: false,
      },
      reason,
      ctx,
      "warning",
      "Scenario revision requested. Revise this scenario before advancing."
    );
  }

  function handleBenchmarkCommand(ctx, explicitValue, viaInput = false) {
    const nextValue = parseBenchmarkToggle(explicitValue, true);
    if (state.benchmarkMode === nextValue) {
      if (ctx?.hasUI) {
        ctx.ui.notify(
          `Planforge benchmark profile is already ${nextValue ? "on" : "off"}.`,
          "info"
        );
      }
      return;
    }

    setState(
      {
        benchmarkMode: nextValue,
      },
      viaInput ? "benchmark-command-input" : "benchmark-command",
      ctx,
      "info",
      `Planforge benchmark profile ${nextValue ? "enabled" : "disabled"}.`
    );
  }

  function handleContinue(ctx) {
    const mode = normalizeExecutionMode(state.executionMode);

    if (mode === "none") {
      ctx.ui.notify(
        "Planforge is in investigation mode. /pf is not needed for read-only investigation.",
        "info"
      );
      return;
    }

    if (!state.enabled) {
      if (mode === "fast") {
        ctx.ui.notify(
          "Planforge is in fast mode. Switch to /skill:planforge if you want supervised approvals.",
          "info"
        );
        return;
      }

      setState(
        {
          enabled: true,
          approved: false,
          scopeVersion: Math.max(1, state.scopeVersion || 1),
          executionMode: mode === "auto" ? "supervised" : mode,
          acceptanceState: "accepted",
          pendingScopeAdvance: false,
          reviewGatesProposed: false,
          reviewGatesApproved: false,
          reviewGates: [],
          reviewGateCursor: 0,
          currentReviewGateId: "",
          acceptedReviewGates: [],
        },
        "continue-auto-enable",
        ctx,
        "info",
        "Planforge gate enabled. Approving current scope."
      );
    }

    const acceptanceState = normalizeAcceptanceState(state.acceptanceState);
    if (acceptanceState === "awaiting" || acceptanceState === "revise_requested") {
      handleAccept(ctx);

      if (state.pendingScopeAdvance) {
        const nextScope = Math.max(1, state.scopeVersion || 1) + 1;
        const accepted = new Set(Array.isArray(state.acceptedReviewGates) ? state.acceptedReviewGates : []);
        const currentGateId = String(state.currentReviewGateId || "");
        if (currentGateId) accepted.add(currentGateId);
        const nextGate = resolveNextReviewGate({ ...state, acceptedReviewGates: Array.from(accepted) });
        setState(
          {
            enabled: true,
            approved: true,
            scopeVersion: nextScope,
            acceptanceState: "accepted",
            pendingScopeAdvance: false,
            currentReviewGateId: "",
            acceptedReviewGates: Array.from(accepted),
            reviewGateCursor: nextGate.index >= 0 ? nextGate.index : Math.max(0, state.reviewGates.length),
          },
          "continue-next-review-gate",
          ctx,
          "success",
          `Review accepted and next scope approved (v${nextScope}).`
        );
      }
      return;
    }

    if (state.approved) {
      ctx.ui.notify(`Continue acknowledged (scope v${Math.max(1, state.scopeVersion || 1)}).`, "info");
      return;
    }

    approveCurrentScope(ctx, "continue-command", true);
  }

  function shouldAutoContinueAfterApproval() {
    const mode = normalizeExecutionMode(state.executionMode);
    const acceptanceState = normalizeAcceptanceState(state.acceptanceState);
    if (mode === "none") return false;
    return state.enabled && state.approved && acceptanceState === "accepted";
  }

  function isReviewGateProposalRequiredForApproval() {
    const mode = normalizeExecutionMode(state.executionMode);
    if (mode === "none") return false;
    return state.enabled && !state.approved && (!state.reviewGatesProposed || !Array.isArray(state.reviewGates) || state.reviewGates.length === 0);
  }

  function triggerAutoContinueFromExtension() {
    if (!shouldAutoContinueAfterApproval()) return;
    pi.sendUserMessage(buildContinuationMessage(state));
  }

  pi.on("session_start", async (_event, ctx) => {
    restore(ctx);
  });

  pi.on("session_switch", async (_event, ctx) => {
    restore(ctx);
  });

  pi.registerCommand("pf", {
    description: "Planforge control command: advance gate (/pf), toggle benchmark (/pf benchmark on|off), or check usage",
    handler: async (args, ctx) => {
      const raw = String(args?.raw || args?.text || args?.input || "").trim();
      const parsed = parsePfArgs(raw);

      if (parsed.type === "benchmark") {
        handleBenchmarkCommand(ctx, parsed.value, false);
        return;
      }

      if (parsed.type === "status") {
        await openStatusOverlay(ctx);
        return;
      }

      if (parsed.type === "unknown") {
        if (ctx?.hasUI) {
          ctx.ui.notify("Unknown /pf subcommand. Use /pf, /pf benchmark on|off, or /pf status.", "warning");
        }
        return;
      }

      if (isReviewGateProposalRequiredForApproval()) {
        const message =
          "Review gates are missing. Ask for a revised plan including a '## Proposed Review Gates' section before approving mutation.";
        if (ctx?.hasUI) {
          ctx.ui.notify(message, "warning");
        } else {
          pi.sendUserMessage("Please revise the plan to include a '## Proposed Review Gates' section (Gate ID, Trigger, Required evidence, Why this gate) before requesting /pf again.");
        }
        return;
      }

      handleContinue(ctx);
      triggerAutoContinueFromExtension();
    },
  });

  pi.on("input", async (event, ctx) => {
    const text = String(event?.text || "").trim();

    if (event?.source === "extension") {
      return { action: "continue" };
    }

    if (PLANFORGE_FAST_SKILL_CMD.test(text)) {
      setState(
        {
          enabled: false,
          approved: false,
          scopeVersion: 0,
          executionMode: "fast",
          acceptanceState: "none",
          pendingScopeAdvance: false,
          benchmarkMode: inferBenchmarkModeFromInput(text) || state.benchmarkMode,
          reviewGatesProposed: false,
          reviewGatesApproved: false,
          reviewGates: [],
          reviewGateCursor: 0,
          currentReviewGateId: "",
          acceptedReviewGates: [],
        },
        "switch-planforge-fast",
        ctx,
        "info",
        "Planforge fast mode detected. Approval gate is off."
      );
      return { action: "continue" };
    }

    if (PLANFORGE_SUPERVISED_SKILL_CMD.test(text)) {
      setState(
        {
          enabled: true,
          approved: false,
          scopeVersion: Math.max(1, state.scopeVersion || 1),
          executionMode: "supervised",
          acceptanceState: "accepted",
          pendingScopeAdvance: false,
          benchmarkMode: inferBenchmarkModeFromInput(text) || state.benchmarkMode,
          reviewGatesProposed: false,
          reviewGatesApproved: false,
          reviewGates: [],
          reviewGateCursor: 0,
          currentReviewGateId: "",
          acceptedReviewGates: [],
        },
        "switch-planforge-supervised",
        ctx,
        "info",
        "Planforge gate enabled for supervised mode. Awaiting /pf before mutation."
      );
      return { action: "continue" };
    }

    if (PLANFORGE_INVESTIGATE_SKILL_CMD.test(text)) {
      setState(
        {
          enabled: false,
          approved: false,
          scopeVersion: 0,
          executionMode: "none",
          acceptanceState: "none",
          pendingScopeAdvance: false,
          benchmarkMode: inferBenchmarkModeFromInput(text) || state.benchmarkMode,
          reviewGatesProposed: false,
          reviewGatesApproved: false,
          reviewGates: [],
          reviewGateCursor: 0,
          currentReviewGateId: "",
          acceptedReviewGates: [],
        },
        "switch-forge-investigate",
        ctx,
        "info",
        "Investigation mode detected. Read-only guard is active; mutation requires switching skills."
      );
      return { action: "continue" };
    }

    if (!state.enabled && FORGE_SKILL_CMD.test(text) && normalizeExecutionMode(state.executionMode) !== "fast") {
      setState(
        {
          enabled: true,
          approved: false,
          scopeVersion: 1,
          executionMode: "supervised",
          acceptanceState: "accepted",
          pendingScopeAdvance: false,
          benchmarkMode: inferBenchmarkModeFromInput(text) || state.benchmarkMode,
          reviewGatesProposed: false,
          reviewGatesApproved: false,
          reviewGates: [],
          reviewGateCursor: 0,
          currentReviewGateId: "",
          acceptedReviewGates: [],
        },
        "auto-enable-forge-skill",
        ctx,
        "info",
        "Planforge gate enabled for this session. Awaiting /pf before mutation."
      );
    }

    const pfMatch = text.match(PF_COMMAND);
    if (pfMatch) {
      const parsed = parsePfArgs(pfMatch[1]);

      if (parsed.type === "benchmark") {
        handleBenchmarkCommand(ctx, parsed.value, true);
        return { action: "continue" };
      }

      if (parsed.type === "status") {
        await openStatusOverlay(ctx);
        return { action: "handled" };
      }

      if (parsed.type === "unknown") {
        return {
          action: "transform",
          text: "Unknown /pf subcommand. Use /pf, /pf benchmark on|off, or /pf status.",
          images: event?.images,
        };
      }

      if (isReviewGateProposalRequiredForApproval()) {
        return {
          action: "transform",
          text: "Before approving mutation, revise the plan to include a '## Proposed Review Gates' section with Gate ID, Trigger, Required evidence, and Why this gate.",
          images: event?.images,
        };
      }

      handleContinue(ctx);
      if (shouldAutoContinueAfterApproval()) {
        return {
          action: "transform",
          text: buildContinuationMessage(state),
          images: event?.images,
        };
      }
      return { action: "handled" };
    }

    if (!state.benchmarkMode && inferBenchmarkModeFromInput(text) && !CONTROL_COMMAND.test(text)) {
      setState(
        {
          benchmarkMode: true,
        },
        "benchmark-auto-detected",
        ctx,
        "info",
        "Planforge benchmark profile enabled from prompt context."
      );
    }

    if (!state.enabled) {
      return { action: "continue" };
    }

    if (REQUEST_REVISION.test(text)) {
      handleRevise(ctx, "scenario-revision-message");
      return { action: "continue" };
    }

    if (CONTROL_COMMAND.test(text)) {
      return { action: "continue" };
    }

    const acceptanceState = normalizeAcceptanceState(state.acceptanceState);
    if (acceptanceState === "awaiting" && text && !TRIVIAL_ACK.test(text)) {
      handleRevise(ctx, "scenario-revision-followup");
      return { action: "continue" };
    }

    if (state.reviewGatesProposed && !state.approved && REVIEW_GATES_PUSHBACK_HINT.test(text)) {
      setState(
        {
          reviewGatesProposed: false,
          reviewGatesApproved: false,
          reviewGates: [],
          reviewGateCursor: 0,
          currentReviewGateId: "",
          acceptedReviewGates: [],
        },
        "review-gates-pushback",
        ctx,
        "info",
        "Review-gate pushback noted. Revise the plan's Proposed Review Gates section before approval."
      );
      return { action: "continue" };
    }

    if (state.approved && text && !TRIVIAL_ACK.test(text)) {
      invalidateForScopeChange(
        ctx,
        "user-followup-invalidated-approval",
        "Planforge gate: user follow-up invalidated prior approval. Re-plan + request explicit re-approval before mutation."
      );
    }

    return { action: "continue" };
  });

  pi.on("message_end", async (event, ctx) => {
    const assistantText = extractAssistantText(event?.message);
    if (!assistantText) return;

    if (hasReviewGateProposal(assistantText)) {
      const parsedGates = parseReviewGates(assistantText);
      if (parsedGates.length > 0) {
        setState(
          {
            reviewGatesProposed: true,
            reviewGatesApproved: false,
            reviewGates: parsedGates,
            reviewGateCursor: 0,
            currentReviewGateId: "",
            acceptedReviewGates: [],
          },
          "review-gates-proposed",
          ctx,
          "info",
          `Review gates proposed in plan (${parsedGates.length}): ${parsedGates.map((gate) => gate.id).join(", ")}. User can push back before approving mutation.`
        );
      }
    }

    if (state.approved && normalizeAcceptanceState(state.acceptanceState) === "accepted") {
      const explicitGateId = extractReachedReviewGateId(assistantText);
      const hasPacket = hasReviewPacket(assistantText);
      let reachedGate = null;
      let reachedIndex = -1;

      if (explicitGateId && Array.isArray(state.reviewGates)) {
        const index = state.reviewGates.findIndex((gate) => gate.id === explicitGateId);
        if (index >= 0) {
          reachedGate = state.reviewGates[index];
          reachedIndex = index;
        }
      }

      if (!reachedGate && hasPacket) {
        const next = resolveNextReviewGate(state);
        reachedGate = next.gate;
        reachedIndex = next.index;
      }

      if (reachedGate || hasPacket) {
        setState(
          {
            approved: false,
            acceptanceState: "awaiting",
            pendingScopeAdvance: true,
            currentReviewGateId: reachedGate ? reachedGate.id : String(state.currentReviewGateId || ""),
            reviewGateCursor: reachedIndex >= 0 ? reachedIndex : state.reviewGateCursor,
          },
          "review-gate-reached",
          ctx,
          "info",
          reachedGate
            ? `Review gate reached: ${reachedGate.id}. Awaiting user acceptance before further mutation.`
            : "Review packet reached. Awaiting user acceptance before further mutation."
        );
      }
    }
  });

  pi.on("before_agent_start", async (event, ctx) => {
    const mode = normalizeExecutionMode(state.executionMode);

    if (mode === "none") {
      return {
        systemPrompt: `${event.systemPrompt}\n\n[Planforge investigation mode]\nRead-only investigation is active. Do not call mutating tools (edit/write/mutating bash). If implementation is needed, ask to switch skills first.`,
      };
    }

    const benchmarkNote = state.benchmarkMode
      ? "[Planforge benchmark profile]\nBenchmark mode is ON. Keep scope strict and avoid unrequested docs churn. Do not claim completion until you report: (1) build/test command result, (2) functional smoke command result, and (3) one negative-path check result. End with explicit verified vs unverified evidence."
      : "";

    if (!state.enabled) {
      if (!benchmarkNote) return;
      return {
        systemPrompt: `${event.systemPrompt}\n\n${benchmarkNote}`,
      };
    }

    const acceptanceState = normalizeAcceptanceState(state.acceptanceState);
    const acceptanceNote =
      acceptanceState === "awaiting"
        ? "A review gate has been reached and is awaiting user acceptance. Ask for explicit acceptance (in supervised mode, /pf accepts and can approve the next scope)."
        : acceptanceState === "revise_requested"
          ? "Current scenario has revision requested. Revise the same scenario; do not advance to the next scenario yet."
          : "";

    const gateNote = state.approved
      ? `Current approved scope (v${state.scopeVersion}) is active. Mutating tools are allowed until the next review gate is reached.`
      : `Current mutating scope (v${Math.max(1, state.scopeVersion || 1)}) is NOT approved. Request /pf before calling mutating tools.`;

    const nextGate = resolveNextReviewGate(state).gate;
    const reviewGateSummary = Array.isArray(state.reviewGates) && state.reviewGates.length > 0
      ? `Review gates: ${state.reviewGates.map((g) => g.id).join(", ")}.`
      : "Review gates: none parsed yet.";

    const reviewGateNote = !state.reviewGatesProposed && !state.approved
      ? "Before requesting /pf for first mutation, include a '## Proposed Review Gates' section with Gate ID, Trigger, Required evidence, and Why this gate."
      : state.reviewGatesProposed && !state.reviewGatesApproved && !state.approved
        ? "Review gates are proposed but not yet approved. Ask the user to accept or adjust them before mutating work."
        : nextGate
          ? `Next review gate: ${nextGate.id}. When presenting the review packet for this gate, include line 'REVIEW_GATE_REACHED: ${nextGate.id}'.`
          : "";

    return {
      systemPrompt: `${event.systemPrompt}\n\n[Planforge approval gate]\n${gateNote}\n${acceptanceNote}\n${reviewGateSummary}\n${reviewGateNote}\nIf scope changes or the user pushes back, re-post a revised plan summary + updated tests and request re-approval before mutating actions.${benchmarkNote ? `\n\n${benchmarkNote}` : ""}`,
    };
  });

  pi.on("tool_call", async (event, ctx) => {
    const mode = normalizeExecutionMode(state.executionMode);
    const toolName = String(event?.toolName || "");
    const bashCommand = String(event?.input?.command || "");
    const isMutatingCall = isMutatingToolCall(event);

    if (mode === "none") {
      if (isMutatingCall) {
        const reason =
          "Planforge investigate mode is read-only. Switch to /skill:planforge or /skill:planforge-fast before mutating tools.";
        if (ctx?.hasUI) ctx.ui.notify(reason, "warning");
        return { block: true, reason };
      }
      return;
    }

    if (!state.enabled) {
      return;
    }

    if (state.approved) {
      return;
    }

    if (toolName === "edit" || toolName === "write") {
      const reason = buildMutationBlockReason(state, toolName);
      if (ctx?.hasUI) ctx.ui.notify(reason, "warning");
      return { block: true, reason };
    }

    if (toolName === "bash" && !isAllowedPreApprovalBash(bashCommand)) {
      const reason = buildBashBlockReason(state);
      if (ctx?.hasUI) ctx.ui.notify(reason, "warning");
      return { block: true, reason };
    }
  });
}
