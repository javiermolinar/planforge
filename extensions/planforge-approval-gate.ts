const STATE_ENTRY_TYPE = "planforge-approval-gate-state";
const DASHBOARD_ENTRY_TYPE = "planforge-dashboard-state";

const STATUS_KEY = "planforge-gate";
const WIDGET_KEY = "planforge-dashboard";

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

const DEFAULT_DASHBOARD_STATE = {
  todos: [],
  nextTodoId: 1,
  updatedAt: 0,
  lastReason: "init",
};

const CONTINUE_APPROVAL = /^\s*(\/?continue)\s*[.!]*\s*$/i;
const TRIVIAL_ACK =
  /^\s*(ok|okay|k|thanks|thank you|got it|roger|understood|sounds good|great|nice|continue)\s*[.!]*\s*$/i;

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

function normalizeDashboardState(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_DASHBOARD_STATE };

  const todos = Array.isArray(raw.todos)
    ? raw.todos
        .map((todo) => {
          if (!todo || typeof todo !== "object") return null;
          const id = Number.isFinite(todo.id) ? Number(todo.id) : NaN;
          const text = typeof todo.text === "string" ? todo.text.trim() : "";
          if (!Number.isInteger(id) || id <= 0 || !text) return null;
          return {
            id,
            text,
            done: Boolean(todo.done),
            createdAt: Number.isFinite(todo.createdAt) ? Number(todo.createdAt) : 0,
          };
        })
        .filter(Boolean)
    : [];

  const maxId = todos.reduce((max, todo) => Math.max(max, todo.id), 0);
  const nextTodoId = Number.isFinite(raw.nextTodoId) ? Number(raw.nextTodoId) : maxId + 1;

  return {
    todos,
    nextTodoId: Math.max(maxId + 1, Math.floor(nextTodoId) || 1),
    updatedAt: Number.isFinite(raw.updatedAt) ? Number(raw.updatedAt) : 0,
    lastReason: typeof raw.lastReason === "string" ? raw.lastReason : "restored",
  };
}

function statusLine(state) {
  const mode = normalizeExecutionMode(state.executionMode);
  const modeLabel = mode === "auto" ? "" : `, mode ${mode}`;
  if (!state.enabled) return `PF gate: off${modeLabel}`;
  if (state.approved) return `PF gate: approved (scope v${state.scopeVersion}${modeLabel})`;
  return `PF gate: waiting approval (scope v${state.scopeVersion}${modeLabel})`;
}

function summarizeTodos(dashboardState) {
  const total = dashboardState.todos.length;
  const done = dashboardState.todos.filter((todo) => todo.done).length;
  const pending = total - done;
  return { total, done, pending };
}

function getWidgetLines(state, dashboardState) {
  const summary = summarizeTodos(dashboardState);
  const lines = [`${statusLine(state)} · todos ${summary.done}/${summary.total}`];

  if (dashboardState.todos.length === 0) {
    lines.push("TODO: none yet · /pf-todo add <task>");
    lines.push("Open full panel: /pf-overlay");
    return lines;
  }

  const pending = dashboardState.todos.filter((todo) => !todo.done);
  const done = dashboardState.todos.filter((todo) => todo.done);
  const ordered = [...pending, ...done].slice(0, 4);

  for (const todo of ordered) {
    lines.push(`${todo.done ? "[x]" : "[ ]"} ${todo.id}. ${todo.text}`);
  }

  if (dashboardState.todos.length > ordered.length) {
    lines.push(`… ${dashboardState.todos.length - ordered.length} more item(s)`);
  }

  lines.push("Open full panel: /pf-overlay");
  return lines;
}

function buildDashboardLines(state, dashboardState) {
  const summary = summarizeTodos(dashboardState);
  const now = new Date().toISOString();

  const lines = [
    "Planforge dashboard",
    "",
    `State: ${statusLine(state)}`,
    `Execution mode: ${normalizeExecutionMode(state.executionMode)}`,
    `Scope version: v${Math.max(1, state.scopeVersion || 1)}`,
    `Updated: ${now}`,
    "",
    `Todos: ${summary.done}/${summary.total} done (${summary.pending} pending)`,
  ];

  if (dashboardState.todos.length === 0) {
    lines.push("- No tasks yet. Add one with: /pf-todo add <task>");
  } else {
    const ordered = [...dashboardState.todos].sort((a, b) => a.id - b.id);
    for (const todo of ordered) {
      lines.push(`${todo.done ? "[x]" : "[ ]"} ${todo.id}. ${todo.text}`);
    }
  }

  lines.push("");
  lines.push("Commands:");
  lines.push("- /pf-todo add <task>");
  lines.push("- /pf-todo done <id> | /pf-todo undone <id>");
  lines.push("- /pf-todo rm <id> | /pf-todo clear");
  lines.push("- Esc / Enter / q to close this panel");

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

function parseTodoCommand(args) {
  const raw = String(args || "").trim();
  if (!raw) return { action: "list" };

  const parts = raw.split(/\s+/);
  const action = String(parts.shift() || "").toLowerCase();
  const rest = parts.join(" ").trim();

  return { action, rest, raw };
}

function parseTodoId(text) {
  const id = Number.parseInt(String(text || "").trim(), 10);
  return Number.isInteger(id) && id > 0 ? id : null;
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
  let state = { ...DEFAULT_STATE };
  let dashboardState = { ...DEFAULT_DASHBOARD_STATE };

  function persist(reason) {
    state = {
      ...state,
      updatedAt: Date.now(),
      lastReason: reason,
    };
    pi.appendEntry(STATE_ENTRY_TYPE, { ...state });
  }

  function persistDashboard(reason) {
    dashboardState = {
      ...dashboardState,
      updatedAt: Date.now(),
      lastReason: reason,
    };
    pi.appendEntry(DASHBOARD_ENTRY_TYPE, { ...dashboardState });
  }

  function render(ctx) {
    if (!ctx?.hasUI) return;
    ctx.ui.setStatus(STATUS_KEY, statusLine(state));
    ctx.ui.setWidget(WIDGET_KEY, getWidgetLines(state, dashboardState));
  }

  function setState(next, reason, ctx, notifyLevel, notifyMessage) {
    state = normalizeState({ ...state, ...next });
    persist(reason);
    render(ctx);
    if (notifyMessage && ctx?.hasUI) {
      ctx.ui.notify(notifyMessage, notifyLevel || "info");
    }
  }

  function setDashboard(next, reason, ctx, notifyLevel, notifyMessage) {
    dashboardState = normalizeDashboardState({ ...dashboardState, ...next });
    persistDashboard(reason);
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
    let restoredGate = null;
    let restoredDashboard = null;

    for (const entry of branch) {
      if (entry?.type !== "custom") continue;
      if (entry?.customType === STATE_ENTRY_TYPE) restoredGate = entry?.data;
      if (entry?.customType === DASHBOARD_ENTRY_TYPE) restoredDashboard = entry?.data;
    }

    state = restoredGate ? normalizeState(restoredGate) : { ...DEFAULT_STATE };
    dashboardState = restoredDashboard ? normalizeDashboardState(restoredDashboard) : { ...DEFAULT_DASHBOARD_STATE };
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

  pi.registerCommand("continue", {
    description: "Approve current Planforge scope and continue supervised execution",
    handler: async (_args, ctx) => {
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
    },
  });

  pi.registerCommand("pf-todo", {
    description: "Manage Planforge todo widget: add/done/undone/rm/clear/list",
    handler: async (args, ctx) => {
      const parsed = parseTodoCommand(args);
      const action = parsed.action;

      if (action === "help") {
        ctx.ui.notify("Usage: /pf-todo add <task> | done <id> | undone <id> | rm <id> | clear | list", "info");
        return;
      }

      if (action === "list" || action === "ls") {
        const summary = summarizeTodos(dashboardState);
        ctx.ui.notify(`Planforge todos: ${summary.done}/${summary.total} done. Open /pf-overlay for full panel.`, "info");
        render(ctx);
        return;
      }

      if (action === "clear") {
        setDashboard(
          {
            todos: [],
            nextTodoId: 1,
          },
          "todo-clear",
          ctx,
          "info",
          "Planforge todos cleared."
        );
        return;
      }

      if (action === "add" || action === "a" || (!action && parsed.rest)) {
        const text = (action === "add" || action === "a") ? parsed.rest : parsed.raw;
        const task = String(text || "").trim();
        if (!task) {
          ctx.ui.notify("Usage: /pf-todo add <task>", "warning");
          return;
        }

        const id = dashboardState.nextTodoId;
        const todos = [...dashboardState.todos, { id, text: task, done: false, createdAt: Date.now() }];
        setDashboard(
          {
            todos,
            nextTodoId: id + 1,
          },
          "todo-add",
          ctx,
          "success",
          `Added todo #${id}.`
        );
        return;
      }

      if (action === "done" || action === "check" || action === "undone" || action === "uncheck") {
        const id = parseTodoId(parsed.rest);
        if (!id) {
          ctx.ui.notify(`Usage: /pf-todo ${action === "done" || action === "check" ? "done" : "undone"} <id>`, "warning");
          return;
        }

        const idx = dashboardState.todos.findIndex((todo) => todo.id === id);
        if (idx < 0) {
          ctx.ui.notify(`Todo #${id} not found.`, "warning");
          return;
        }

        const todos = dashboardState.todos.map((todo) =>
          todo.id === id ? { ...todo, done: action === "done" || action === "check" } : todo
        );

        const isDone = action === "done" || action === "check";
        setDashboard(
          { todos },
          isDone ? "todo-done" : "todo-undone",
          ctx,
          "success",
          `Todo #${id} marked ${isDone ? "done" : "pending"}.`
        );
        return;
      }

      if (action === "rm" || action === "remove" || action === "del" || action === "delete") {
        const id = parseTodoId(parsed.rest);
        if (!id) {
          ctx.ui.notify("Usage: /pf-todo rm <id>", "warning");
          return;
        }

        const before = dashboardState.todos.length;
        const todos = dashboardState.todos.filter((todo) => todo.id !== id);
        if (todos.length === before) {
          ctx.ui.notify(`Todo #${id} not found.`, "warning");
          return;
        }

        setDashboard({ todos }, "todo-remove", ctx, "success", `Removed todo #${id}.`);
        return;
      }

      if (parsed.raw) {
        const id = dashboardState.nextTodoId;
        const todos = [...dashboardState.todos, { id, text: parsed.raw, done: false, createdAt: Date.now() }];
        setDashboard(
          {
            todos,
            nextTodoId: id + 1,
          },
          "todo-add-implicit",
          ctx,
          "success",
          `Added todo #${id}.`
        );
        return;
      }

      ctx.ui.notify("Usage: /pf-todo add <task> | done <id> | undone <id> | rm <id> | clear | list", "info");
    },
  });

  pi.registerCommand("pf-overlay", {
    description: "Show the Planforge state + todo overlay panel",
    handler: async (_args, ctx) => {
      if (!ctx?.hasUI) return;

      await ctx.ui.custom(
        (tui, _theme, _keybindings, done) =>
          buildOverlayComponent(tui, () => buildDashboardLines(state, dashboardState), done),
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
      render(ctx);
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
        "Planforge gate enabled for supervised mode. Awaiting /continue before mutation."
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
        "Planforge gate enabled for this session. Awaiting /continue before mutation."
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
      : `Current scope v${Math.max(1, state.scopeVersion || 1)} is NOT approved. Request /continue before calling mutating tools.`;

    return {
      systemPrompt: `${event.systemPrompt}\n\n[Planforge approval gate]\n${gateNote}\nIf scope changes or the user pushes back, re-post a revised plan summary + updated tests and request re-approval before mutating actions.`,
    };
  });

  pi.on("tool_call", async (event, ctx) => {
    if (!state.enabled || state.approved) {
      return;
    }

    if (event?.toolName === "edit" || event?.toolName === "write") {
      const reason = "Planforge gate blocked mutation: /continue approval is required for current scope.";
      if (ctx?.hasUI) ctx.ui.notify(reason, "warning");
      return { block: true, reason };
    }

    if (event?.toolName === "bash") {
      const command = String(event?.input?.command || "");
      if (!isAllowedPreApprovalBash(command)) {
        const reason =
          "Planforge gate blocked bash command before /continue. Allowed pre-approval commands: ls, rg, find, git status, git branch --show-current, pwd.";
        if (ctx?.hasUI) ctx.ui.notify(reason, "warning");
        return { block: true, reason };
      }
    }
  });
}
