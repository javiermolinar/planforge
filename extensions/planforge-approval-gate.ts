const STATE_ENTRY_TYPE = "planforge-approval-gate-state";

const STATUS_KEY = "planforge-gate";

const EXECUTION_MODES = new Set(["auto", "supervised", "fast", "none"]);

function normalizeExecutionMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return EXECUTION_MODES.has(normalized) ? normalized : "auto";
}

const DEFAULT_STATE = {
  enabled: false,
  approved: false,
  approvalConsumed: false,
  scopeVersion: 0,
  approvedScopeVersion: 0,
  executionMode: "auto",
  updatedAt: 0,
  lastReason: "init",
};

const CONTINUE_APPROVAL = /^\s*(\/?pf-continue)\s*[.!]*\s*$/i;
const TRIVIAL_ACK =
  /^\s*(ok|okay|k|thanks|thank you|got it|roger|understood|sounds good|great|nice|pf-continue)\s*[.!]*\s*$/i;

const PLANFORGE_SUPERVISED_SKILL_CMD = /^\s*\/skill:planforge\b/i;
const PLANFORGE_FAST_SKILL_CMD = /^\s*\/skill:planforge-fast\b/i;
const PLANFORGE_INVESTIGATE_SKILL_CMD = /^\s*\/skill:forge-investigate\b/i;
const FORGE_SKILL_CMD = /^\s*\/skill:forge-[a-z0-9-]+\b/i;
const CONTROL_COMMAND = /^\s*\/[a-z0-9:-]+\b/i;

const SHELL_META_PATTERN = /[<>`]|\$\(|\|(?!=\|)|&(?!&)/;

function splitCommandSegments(command) {
  return String(command || "")
    .split(/&&|\|\||;|\n/g)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function isAllowedPreApprovalSegment(segment) {
  const trimmed = String(segment || "").trim();
  if (!trimmed) return true;
  if (SHELL_META_PATTERN.test(trimmed)) return false;

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

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
  const approvedScopeVersion = Number.isFinite(state.approvedScopeVersion)
    ? Number(state.approvedScopeVersion)
    : 0;

  return {
    enabled: Boolean(state.enabled),
    approved: Boolean(state.approved),
    approvalConsumed: Boolean(state.approvalConsumed),
    scopeVersion: Math.max(0, scopeVersion),
    approvedScopeVersion: Math.max(0, approvedScopeVersion),
    executionMode: normalizeExecutionMode(state.executionMode),
    updatedAt: Number.isFinite(state.updatedAt) ? Number(state.updatedAt) : 0,
    lastReason: typeof state.lastReason === "string" ? state.lastReason : "restored",
  };
}

function statusLine(state) {
  const mode = normalizeExecutionMode(state.executionMode);
  const modeLabel = mode === "auto" ? "" : `, mode ${mode}`;
  if (mode === "none") return `PF gate: investigate read-only${modeLabel}`;
  if (!state.enabled) return `PF gate: off${modeLabel}`;
  if (state.approved && state.approvalConsumed) {
    return `PF gate: checkpoint used (scope v${state.scopeVersion}${modeLabel}), awaiting /pf-continue`;
  }
  if (state.approved) return `PF gate: approved (scope v${state.scopeVersion}${modeLabel})`;
  return `PF gate: waiting approval (scope v${state.scopeVersion}${modeLabel})`;
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

  function approveCurrentScope(ctx, reason, notify = true) {
    const scope = Math.max(1, state.scopeVersion || 1);
    setState(
      {
        enabled: true,
        approved: true,
        approvalConsumed: false,
        scopeVersion: scope,
        approvedScopeVersion: scope,
      },
      reason,
      ctx,
      notify ? "success" : undefined,
      notify ? `Planforge gate approved for scope v${scope}.` : undefined
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
        approvalConsumed: false,
        scopeVersion: nextScope,
        approvedScopeVersion: 0,
      },
      reason,
      ctx,
      "warning",
      message || "Planforge gate: scope changed. Re-post plan + tests and request explicit approval."
    );
  }

  function handleContinue(ctx) {
    const mode = normalizeExecutionMode(state.executionMode);

    if (mode === "none") {
      ctx.ui.notify(
        "Planforge is in investigation mode. /pf-continue is not needed for read-only investigation.",
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
          approvalConsumed: false,
          scopeVersion: Math.max(1, state.scopeVersion || 1),
          approvedScopeVersion: 0,
          executionMode: mode === "auto" ? "supervised" : mode,
        },
        "continue-auto-enable",
        ctx,
        "info",
        "Planforge gate enabled. Approving current scope."
      );
    }

    if (state.approved) {
      if (state.approvalConsumed) {
        const nextScope = Math.max(1, state.scopeVersion || 1) + 1;
        setState(
          {
            enabled: true,
            approved: true,
            approvalConsumed: false,
            scopeVersion: nextScope,
            approvedScopeVersion: nextScope,
          },
          "continue-next-checkpoint",
          ctx,
          "success",
          `Planforge gate approved for next mutating checkpoint (scope v${nextScope}).`
        );
        return;
      }

      ctx.ui.notify(`Continue acknowledged (scope v${Math.max(1, state.scopeVersion || 1)}).`, "info");
      return;
    }

    approveCurrentScope(ctx, "continue-command", true);
  }

  pi.on("session_start", async (_event, ctx) => {
    restore(ctx);
  });

  pi.on("session_switch", async (_event, ctx) => {
    restore(ctx);
  });

  pi.registerCommand("pf-continue", {
    description: "Approve current Planforge mutating checkpoint and continue supervised execution",
    handler: async (_args, ctx) => {
      handleContinue(ctx);
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
          approvalConsumed: false,
          scopeVersion: 0,
          approvedScopeVersion: 0,
          executionMode: "fast",
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
          approvalConsumed: false,
          scopeVersion: Math.max(1, state.scopeVersion || 1),
          approvedScopeVersion: 0,
          executionMode: "supervised",
        },
        "switch-planforge-supervised",
        ctx,
        "info",
        "Planforge gate enabled for supervised mode. Awaiting /pf-continue before mutation."
      );
      return { action: "continue" };
    }

    if (PLANFORGE_INVESTIGATE_SKILL_CMD.test(text)) {
      setState(
        {
          enabled: false,
          approved: false,
          approvalConsumed: false,
          scopeVersion: 0,
          approvedScopeVersion: 0,
          executionMode: "none",
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
          approvalConsumed: false,
          scopeVersion: 1,
          approvedScopeVersion: 0,
          executionMode: "supervised",
        },
        "auto-enable-forge-skill",
        ctx,
        "info",
        "Planforge gate enabled for this session. Awaiting /pf-continue before mutation."
      );
    }

    if (!state.enabled) {
      return { action: "continue" };
    }

    if (CONTINUE_APPROVAL.test(text)) {
      handleContinue(ctx);
      return { action: "continue" };
    }

    if (CONTROL_COMMAND.test(text)) {
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

  pi.on("before_agent_start", async (event, ctx) => {
    const mode = normalizeExecutionMode(state.executionMode);

    if (mode === "none") {
      return {
        systemPrompt: `${event.systemPrompt}\n\n[Planforge investigation mode]\nRead-only investigation is active. Do not call mutating tools (edit/write/mutating bash). If implementation is needed, ask to switch skills first.`,
      };
    }

    if (!state.enabled) return;

    if (state.approved && state.approvalConsumed) {
      setState(
        {
          approved: false,
          approvalConsumed: false,
          approvedScopeVersion: 0,
        },
        "checkpoint-approval-expired",
        ctx
      );
    }

    const gateNote = state.approved
      ? `Current mutating checkpoint (scope v${state.scopeVersion}) is approved. Mutating tools are allowed for this checkpoint.`
      : `Current mutating checkpoint (scope v${Math.max(1, state.scopeVersion || 1)}) is NOT approved. Request /pf-continue before calling mutating tools.`;

    return {
      systemPrompt: `${event.systemPrompt}\n\n[Planforge approval gate]\n${gateNote}\nIf scope changes or the user pushes back, re-post a revised plan summary + updated tests and request re-approval before mutating actions.`,
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
      if (isMutatingCall && !state.approvalConsumed) {
        setState(
          {
            approvalConsumed: true,
          },
          "checkpoint-mutation-seen",
          ctx
        );
      }
      return;
    }

    if (toolName === "edit" || toolName === "write") {
      const reason = "Planforge gate blocked mutation: /pf-continue approval is required for current checkpoint.";
      if (ctx?.hasUI) ctx.ui.notify(reason, "warning");
      return { block: true, reason };
    }

    if (toolName === "bash" && !isAllowedPreApprovalBash(bashCommand)) {
      const reason =
        "Planforge gate blocked bash command before /pf-continue. Allowed pre-approval commands: ls, rg, find, git status, git branch --show-current, pwd.";
      if (ctx?.hasUI) ctx.ui.notify(reason, "warning");
      return { block: true, reason };
    }
  });
}
