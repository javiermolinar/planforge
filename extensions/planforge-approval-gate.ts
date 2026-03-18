const STATE_ENTRY_TYPE = "planforge-approval-gate-state";

const STATUS_KEY = "planforge-gate";

const EXECUTION_MODES = new Set(["auto", "supervised", "fast"]);

function normalizeExecutionMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return EXECUTION_MODES.has(normalized) ? normalized : "auto";
}

const DEFAULT_STATE = {
  enabled: false,
  approved: false,
  scopeVersion: 0,
  approvedScopeVersion: 0,
  executionMode: "auto",
  updatedAt: 0,
  lastReason: "init",
};

const CONTINUE_APPROVAL = /^\s*(\/?(?:pf-continue|continue))\s*[.!]*\s*$/i;
const TRIVIAL_ACK =
  /^\s*(ok|okay|k|thanks|thank you|got it|roger|understood|sounds good|great|nice|continue|pf-continue)\s*[.!]*\s*$/i;

const PLANFORGE_SUPERVISED_SKILL_CMD = /^\s*\/skill:planforge\b/i;
const PLANFORGE_FAST_SKILL_CMD = /^\s*\/skill:planforge-fast\b/i;
const FORGE_SKILL_CMD = /^\s*\/skill:forge-[a-z0-9-]+\b/i;
const CONTROL_COMMAND = /^\s*\/[a-z0-9:-]+\b/i;

const PRE_APPROVAL_BASH_ALLOWLIST = [
  /^ls(\s|$)/,
  /^rg(\s|$)/,
  /^find(\s|$)/,
  /^git\s+status(\s|$)/,
  /^git\s+branch\s+--show-current(\s|$)/,
  /^pwd(\s|$)/,
];

function splitCommandSegments(command) {
  return String(command || "")
    .split(/&&|\|\||;|\n/g)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function isAllowedPreApprovalBash(command) {
  const trimmed = String(command || "").trim();
  if (!trimmed) return true;

  const segments = splitCommandSegments(trimmed);
  if (segments.length === 0) return true;

  return segments.every((segment) => PRE_APPROVAL_BASH_ALLOWLIST.some((pattern) => pattern.test(segment)));
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
  if (!state.enabled) return `PF gate: off${modeLabel}`;
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
    if (!state.enabled) {
      if (normalizeExecutionMode(state.executionMode) === "fast") {
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
          approvedScopeVersion: 0,
          executionMode: normalizeExecutionMode(state.executionMode) === "auto" ? "supervised" : state.executionMode,
        },
        "continue-auto-enable",
        ctx,
        "info",
        "Planforge gate enabled. Approving current scope."
      );
    }

    if (state.approved) {
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
    description: "Approve current Planforge scope and continue supervised execution",
    handler: async (_args, ctx) => {
      handleContinue(ctx);
    },
  });

  // Backward-compatible alias.
  pi.registerCommand("continue", {
    description: "Alias for /pf-continue",
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

    if (!state.enabled && FORGE_SKILL_CMD.test(text) && normalizeExecutionMode(state.executionMode) !== "fast") {
      setState(
        {
          enabled: true,
          approved: false,
          scopeVersion: 1,
          approvedScopeVersion: 0,
          executionMode: normalizeExecutionMode(state.executionMode) === "auto" ? "supervised" : state.executionMode,
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
      if (!state.approved) {
        approveCurrentScope(ctx, "continue-input", true);
      }
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

  pi.on("before_agent_start", async (event) => {
    if (!state.enabled) return;

    const gateNote = state.approved
      ? `Current scope v${state.scopeVersion} is approved. Mutating tools are allowed for this scope only.`
      : `Current scope v${Math.max(1, state.scopeVersion || 1)} is NOT approved. Request /pf-continue before calling mutating tools.`;

    return {
      systemPrompt: `${event.systemPrompt}\n\n[Planforge approval gate]\n${gateNote}\nIf scope changes or the user pushes back, re-post a revised plan summary + updated tests and request re-approval before mutating actions.`,
    };
  });

  pi.on("tool_call", async (event, ctx) => {
    if (!state.enabled || state.approved) {
      return;
    }

    if (event?.toolName === "edit" || event?.toolName === "write") {
      const reason = "Planforge gate blocked mutation: /pf-continue approval is required for current scope.";
      if (ctx?.hasUI) ctx.ui.notify(reason, "warning");
      return { block: true, reason };
    }

    if (event?.toolName === "bash") {
      const command = String(event?.input?.command || "");
      if (!isAllowedPreApprovalBash(command)) {
        const reason =
          "Planforge gate blocked bash command before /pf-continue. Allowed pre-approval commands: ls, rg, find, git status, git branch --show-current, pwd.";
        if (ctx?.hasUI) ctx.ui.notify(reason, "warning");
        return { block: true, reason };
      }
    }
  });
}
