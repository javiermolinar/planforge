const STATE_ENTRY_TYPE = "planforge-approval-gate-state";
const STATUS_KEY = "planforge-gate";

const BASH_POLICIES = new Set(["strict", "balanced"]);

function isValidBashPolicy(value) {
  return BASH_POLICIES.has(String(value || "").trim().toLowerCase());
}

function normalizeBashPolicy(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return isValidBashPolicy(normalized) ? normalized : "balanced";
}

const DEFAULT_BASH_POLICY = normalizeBashPolicy(process.env.PLANFORGE_GATE_BASH_POLICY || "balanced");

const EXECUTION_MODES = new Set(["auto", "supervised", "yolo"]);

function normalizeExecutionMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return EXECUTION_MODES.has(normalized) ? normalized : "auto";
}

const DEFAULT_STATE = {
  enabled: false,
  approved: false,
  scopeVersion: 0,
  approvedScopeVersion: 0,
  bashPolicy: DEFAULT_BASH_POLICY,
  executionMode: "auto",
  updatedAt: 0,
  lastReason: "init",
};

const CONTINUE_APPROVAL = /^\s*(\/?continue)\s*[.!]*\s*$/i;
const ACTION_REJECTION = /^\s*reject\s+[A-Za-z0-9._:-]+\s*$/i;
const TRIVIAL_ACK = /^\s*(ok|okay|k|thanks|thank you|got it|roger|understood|sounds good|great|nice|continue)\s*[.!]*\s*$/i;
const PLANFORGE_SUPERVISED_SKILL_CMD = /^\s*\/skill:planforge\b/i;
const PLANFORGE_YOLO_SKILL_CMD = /^\s*\/skill:planforge-yolo\b/i;
const FORGE_SKILL_CMD = /^\s*\/skill:forge-[a-z0-9-]+\b/i;
const CONTROL_COMMAND = /^\s*\/[a-z0-9:-]+\b/i;

const MUTATING_BASH_TOKENS = [
  /(^|[^<])>>?/, // redirection
  /\|\s*(tee|xargs)\b/,
  /\b(find\b[^\n]*\s-exec\b)/,
  /\b(rm|mv|cp|mkdir|rmdir|touch|chmod|chown|chgrp|ln|install|truncate|dd)\b/,
  /\b(git\s+(add|commit|push|pull|merge|rebase|reset|revert|restore(?!\s+--staged)|checkout|switch|branch(?!\s+--show-current)|stash|tag|fetch|cherry-pick|am|clean|worktree|submodule|apply))\b/,
  /\b(npm|pnpm|yarn|bun)\s+(install|add|remove|update|upgrade|uninstall|link|unlink|publish|run)\b/,
  /\b(pip|uv\s+pip|cargo\s+install|go\s+install|brew\s+install|apt\s+install)\b/,
  /\b(plan-init|plan-set-section|plan-append-item|plan-next-init|plan-ship)\b/,
  /\b(source|\.\s+[^\s])\b/,
  /\bexport\s+[A-Za-z_][A-Za-z0-9_]*=/,
  /[`$]\(/,
];

const STRICT_READ_ONLY_SEGMENTS = [
  /^ls(\s|$)/,
  /^rg(\s|$)/,
  /^find(\s|$)/,
  /^git\s+status(\s|$)/,
  /^git\s+branch\s+--show-current(\s|$)/,
];

const BALANCED_READ_ONLY_SEGMENTS = [
  /^(ls|pwd|which|type|env|printenv|echo|printf)(\s|$)/,
  /^(rg|grep|find|tree|stat|du|df|file|wc|head|tail|cut|sort|uniq|nl|awk|sed(\s+-n)?|cat)(\s|$)/,
  /^git\s+status(\s|$)/,
  /^git\s+branch\s+--show-current(\s|$)/,
  /^git\s+(diff|log|show|rev-parse|remote\s+-v|ls-files)(\s|$)/,
  /^test\s+-[efd](\s|$)/,
  /^\[\s*-[efd]\s+[^\]]+\]$/,
];

function readOnlyPatternsForPolicy(policy) {
  return policy === "strict" ? STRICT_READ_ONLY_SEGMENTS : BALANCED_READ_ONLY_SEGMENTS;
}

function policyReadOnlyHint(policy) {
  if (policy === "strict") {
    return "Strict mode allows only: ls, rg, find, git status, git branch --show-current.";
  }
  return "Balanced mode allows a broader set of read-only inspection commands.";
}

function splitCommandSegments(command) {
  return String(command || "")
    .split(/&&|\|\||;|\n/g)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function isReadOnlyBash(command, bashPolicy) {
  const trimmed = String(command || "").trim();
  if (!trimmed) return true;

  const segments = splitCommandSegments(trimmed);
  if (segments.length === 0) return true;

  const patterns = readOnlyPatternsForPolicy(normalizeBashPolicy(bashPolicy));
  return segments.every((segment) => patterns.some((pattern) => pattern.test(segment)));
}

function isMutatingBash(command, bashPolicy) {
  const text = String(command || "");
  if (!text.trim()) return false;

  if (MUTATING_BASH_TOKENS.some((pattern) => pattern.test(text))) {
    return true;
  }

  return !isReadOnlyBash(text, bashPolicy);
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
    bashPolicy: normalizeBashPolicy(state.bashPolicy),
    executionMode: normalizeExecutionMode(state.executionMode),
    updatedAt: Number.isFinite(state.updatedAt) ? Number(state.updatedAt) : 0,
    lastReason: typeof state.lastReason === "string" ? state.lastReason : "restored",
  };
}

function statusLine(state) {
  const policy = normalizeBashPolicy(state.bashPolicy);
  const mode = normalizeExecutionMode(state.executionMode);
  const modeLabel = mode === "auto" ? "" : `, mode ${mode}`;
  if (!state.enabled) return `PF gate: off (bash ${policy}${modeLabel})`;
  if (state.approved) return `PF gate: approved (scope v${state.scopeVersion}, bash ${policy}${modeLabel})`;
  return `PF gate: waiting approval (scope v${state.scopeVersion}, bash ${policy}${modeLabel})`;
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

  pi.on("session_start", async (_event, ctx) => {
    restore(ctx);
  });

  pi.on("session_switch", async (_event, ctx) => {
    restore(ctx);
  });

  pi.registerCommand("pf-gate", {
    description:
      "Planforge approval gate: status | on | off | approve | revoke | scope-changed | policy [strict|balanced]",
    handler: async (args, ctx) => {
      const tokens = String(args || "status")
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      const action = tokens[0] || "status";
      const value = tokens[1] || "";

      if (action === "status") {
        ctx.ui.notify(statusLine(state), "info");
        return;
      }

      if (action === "on") {
        setState(
          {
            enabled: true,
            approved: false,
            scopeVersion: Math.max(1, state.scopeVersion || 1),
            approvedScopeVersion: 0,
          },
          "manual-on",
          ctx,
          "info",
          "Planforge gate enabled. Explicit approval is now required before mutation."
        );
        return;
      }

      if (action === "off") {
        setState(
          {
            enabled: false,
            approved: false,
            scopeVersion: 0,
            approvedScopeVersion: 0,
          },
          "manual-off",
          ctx,
          "warning",
          "Planforge gate disabled for this session."
        );
        return;
      }

      if (action === "approve") {
        approveCurrentScope(ctx, "manual-approve", true);
        return;
      }

      if (action === "revoke") {
        setState(
          {
            enabled: true,
            approved: false,
            scopeVersion: Math.max(1, state.scopeVersion || 1),
            approvedScopeVersion: 0,
          },
          "manual-revoke",
          ctx,
          "warning",
          "Planforge gate approval revoked."
        );
        return;
      }

      if (action === "scope-changed" || action === "scope") {
        invalidateForScopeChange(
          ctx,
          "manual-scope-changed",
          "Planforge gate: scope marked as changed. Re-plan and request explicit re-approval."
        );
        return;
      }

      if (action === "policy") {
        if (!value || value === "status") {
          ctx.ui.notify(
            `Planforge gate bash policy: ${normalizeBashPolicy(state.bashPolicy)}. ${policyReadOnlyHint(
              state.bashPolicy
            )}`,
            "info"
          );
          return;
        }

        if (!isValidBashPolicy(value)) {
          ctx.ui.notify("Invalid policy. Use: /pf-gate policy strict|balanced", "warning");
          return;
        }

        const nextPolicy = normalizeBashPolicy(value);
        setState(
          {
            bashPolicy: nextPolicy,
          },
          "manual-policy",
          ctx,
          "info",
          `Planforge gate bash policy set to '${nextPolicy}'. ${policyReadOnlyHint(nextPolicy)}`
        );
        return;
      }

      ctx.ui.notify(
        "Usage: /pf-gate status | on | off | approve | revoke | scope-changed | policy [strict|balanced]",
        "warning"
      );
    },
  });

  pi.registerCommand("continue", {
    description: "Approve current Planforge scope and continue supervised execution",
    handler: async (_args, ctx) => {
      if (!state.enabled) {
        if (normalizeExecutionMode(state.executionMode) === "yolo") {
          ctx.ui.notify(
            "Planforge is in YOLO mode with gate off. Use /pf-gate on first if you want runtime mutation blocking.",
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
    },
  });

  pi.on("input", async (event, ctx) => {
    const text = String(event?.text || "").trim();

    if (event?.source === "extension") {
      return { action: "continue" };
    }

    if (PLANFORGE_YOLO_SKILL_CMD.test(text)) {
      setState(
        {
          enabled: false,
          approved: false,
          scopeVersion: 0,
          approvedScopeVersion: 0,
          executionMode: "yolo",
        },
        "switch-planforge-yolo",
        ctx,
        "info",
        "Planforge YOLO mode detected. Approval gate left off unless manually enabled with /pf-gate on."
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
        "Planforge gate enabled for supervised mode. Awaiting explicit approval before mutation."
      );
      return { action: "continue" };
    }

    if (!state.enabled && FORGE_SKILL_CMD.test(text) && normalizeExecutionMode(state.executionMode) !== "yolo") {
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
        "Planforge gate enabled for this session. Awaiting explicit approval before mutation."
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

    if (ACTION_REJECTION.test(text) || CONTROL_COMMAND.test(text)) {
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

    const bashPolicy = normalizeBashPolicy(state.bashPolicy);
    const gateNote = state.approved
      ? `Current scope v${state.scopeVersion} is explicitly approved. Mutating tools are allowed for this scope only.`
      : `Current scope v${Math.max(1, state.scopeVersion || 1)} is NOT approved. Do not call mutating tools (edit/write/mutating bash with '${bashPolicy}' policy). Request explicit approval first.`;

    return {
      systemPrompt: `${event.systemPrompt}\n\n[Planforge approval gate]\n${gateNote}\n${policyReadOnlyHint(
        bashPolicy
      )}\nIf scope changes or the user pushes back, re-post a revised plan summary + updated tests and request re-approval before mutating actions.`,
    };
  });

  pi.on("tool_call", async (event, ctx) => {
    if (!state.enabled || state.approved) {
      return;
    }

    if (event?.toolName === "edit" || event?.toolName === "write") {
      const reason = "Planforge gate blocked mutation: explicit approval is required for current scope.";
      if (ctx?.hasUI) ctx.ui.notify(reason, "warning");
      return { block: true, reason };
    }

    if (event?.toolName === "bash") {
      const command = String(event?.input?.command || "");
      const bashPolicy = normalizeBashPolicy(state.bashPolicy);
      if (isMutatingBash(command, bashPolicy)) {
        const reason =
          `Planforge gate blocked mutating bash command before approval under '${bashPolicy}' policy. ` +
          policyReadOnlyHint(bashPolicy);
        if (ctx?.hasUI) ctx.ui.notify(reason, "warning");
        return { block: true, reason };
      }
    }
  });
}
