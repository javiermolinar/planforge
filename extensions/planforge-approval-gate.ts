const { execSync } = require("child_process");
const proc = require("process");

let gateShared;
try {
  gateShared = require("../lib/planforge-gate-shared.js");
} catch {
  gateShared = require("./lib/planforge-gate-shared.js");
}

const {
  normalizeExecutionMode,
  normalizeAcceptanceState,
  normalizeScopeKind,
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

function extractMarkdownSection(text, headingPattern) {
  const normalized = String(text || "");
  const match = normalized.match(headingPattern);
  if (!match || match.index == null) return "";

  const rest = normalized.slice(match.index);
  const nextHeaderIndex = rest.slice(1).search(/\n##\s+/);
  if (nextHeaderIndex < 0) return rest;
  return rest.slice(0, nextHeaderIndex + 1);
}

function parseCloseoutScope(text) {
  const section = extractMarkdownSection(text, CLOSEOUT_SECTION_HINT);
  const normalized = String(section || "").toLowerCase();
  if (!normalized.trim()) return { declared: false, operations: [] };

  const operations = [];
  if (/doc|generate|regenerate|artifact/.test(normalized)) operations.push("generated-docs");
  if (/fmt|format|lint|vet|test|verify|verification|smoke|build/.test(normalized)) operations.push("verification");
  if (/commit/.test(normalized)) operations.push("commit");
  if (/push/.test(normalized)) operations.push("push");
  if (/pull request|\bpr\b/.test(normalized)) operations.push("pr");

  return { declared: true, operations: Array.from(new Set(operations)) };
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
  scopeKind: "none",
  scopeReason: "",
  closeoutDeclared: false,
  closeoutActive: false,
  closeoutOperations: [],
  updatedAt: 0,
  lastReason: "init",
};

const PF_COMMAND = /^\s*\/?pf(?:\s+(.+?))?\s*[.!]*\s*$/i;
const REQUEST_REVISION = /^\s*(needs? changes?|revise|not right|fix this)\s*[.!]*\s*$/i;
const TRIVIAL_ACK =
  /^\s*(ok|okay|k|thanks|thank you|got it|roger|understood|sounds good|great|nice|pf|continue|go ahead|proceed|carry on|keep going|approved|lgtm|ship it|looks good)\s*[.!]*\s*$/i;

const PLANFORGE_SUPERVISED_SKILL_CMD = /^\s*\/skill:planforge\b/i;
const PLANFORGE_FAST_SKILL_CMD = /^\s*\/skill:planforge-fast\b/i;
const PLANFORGE_INVESTIGATE_SKILL_CMD = /^\s*\/skill:forge-investigate\b/i;
const FORGE_SKILL_CMD = /^\s*\/skill:forge-[a-z0-9-]+\b/i;
const CONTROL_COMMAND = /^\s*\/[a-z0-9:-]+\b/i;
const BENCHMARK_HINT = /\b(benchmark|scorecard|evaluation|leaderboard)\b/i;
const REVIEW_GATES_SECTION_HINT = /##\s*Proposed\s*Review\s*Gates/i;
const REVIEW_GATES_TABLE_HINT = /\|\s*Gate\s*ID\s*\|\s*Trigger\s*\|\s*Required\s*evidence\s*\|/i;
const CLOSEOUT_SECTION_HINT = /##\s*Closeout\s*Scope/i;
const REVIEW_GATES_PUSHBACK_HINT = /\b(review\s+gate|gates?)\b.*\b(change|revise|remove|drop|adjust|one|single|final|only)\b|\b(change|revise|remove|drop|adjust)\b.*\b(review\s+gate|gates?)\b/i;
const REVIEW_PACKET_HINT = /\bverified\s+vs\s+unverified\b/i;
const REVIEW_PACKET_EVIDENCE_HINT = /\bevidence\b|\bbuild\b|\bsmoke\b|\bnegative[- ]path\b/i;
const CLOSEOUT_FOLLOWUP_HINT = /\b(doc(?:s|umentation)?|generate|regenerate|fmt|format|lint|vet|test|verify|verification|commit|push|pull\s+request|\bpr\b|changelog)\b/i;

function isNaturalAcceptance(text) {
  const normalized = String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[.!]+$/g, "");

  return normalized === "looks good"
    || normalized === "looks good, continue"
    || normalized === "lgtm"
    || normalized === "approved"
    || normalized === "ship it"
    || normalized === "continue"
    || normalized === "go ahead"
    || normalized === "proceed"
    || normalized === "carry on"
    || normalized === "keep going";
}

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

function splitPipelineSegments(segment) {
  const segments = [];
  let start = 0;

  scanShell(segment, (ch, index, state) => {
    if (state.quote) return;
    if (ch === "|" && state.next !== "|") {
      const nextSegment = String(segment || "").slice(start, index).trim();
      if (nextSegment) segments.push(nextSegment);
      start = index + 1;
    }
  });

  const tail = String(segment || "").slice(start).trim();
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

function isAllowedReadOnlyFilterSegment(tokens) {
  const [cmd] = Array.isArray(tokens) ? tokens : [];
  if (!cmd) return false;
  return cmd === "wc"
    || cmd === "head"
    || cmd === "tail"
    || cmd === "sort"
    || cmd === "uniq"
    || cmd === "cut"
    || cmd === "tr"
    || cmd === "grep"
    || cmd === "rg";
}

function isAllowedReadOnlyPipeline(segment) {
  const parts = splitPipelineSegments(segment);
  if (parts.length < 2) return false;

  const [first, ...rest] = parts;
  if (!isAllowedPreApprovalSegment(first)) return false;

  return rest.every((part) => {
    if (hasBlockedShellMeta(part)) return false;
    const tokens = tokenizeShellWords(part);
    return Array.isArray(tokens) && tokens.length > 0 && isAllowedReadOnlyFilterSegment(tokens);
  });
}

function detectCurrentBranch() {
  const override = String(proc.env.PLANFORGE_TEST_CURRENT_BRANCH || "").trim();
  if (override) return override;
  try {
    return execSync("git branch --show-current", {
      cwd: proc.cwd(),
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

function isTrunkLikeBranch(branchName) {
  const normalized = String(branchName || "").trim().toLowerCase();
  return normalized === "main" || normalized === "master" || normalized === "trunk";
}

function isAllowedReadOnlyGitSegment(tokens) {
  const [, subcmd, third] = tokens;
  if (subcmd === "status" || subcmd === "diff" || subcmd === "log") return true;
  if (subcmd === "branch" && third === "--show-current" && tokens.length === 3) return true;
  if (subcmd === "remote" && third === "-v" && tokens.length === 3) return true;
  return false;
}

function consumeCurlFlagArg(tokens, index) {
  return index + 1 < tokens.length ? index + 1 : -1;
}

function isAllowedReadOnlyCurlSegment(tokens) {
  if (!Array.isArray(tokens) || tokens[0] !== "curl") return false;

  let sawUrl = false;

  for (let i = 1; i < tokens.length; i += 1) {
    const token = String(tokens[i] || "");
    if (!token) continue;

    if (!token.startsWith("-")) {
      sawUrl = true;
      continue;
    }

    if (token === "--") {
      for (let j = i + 1; j < tokens.length; j += 1) {
        if (String(tokens[j] || "").trim()) sawUrl = true;
      }
      break;
    }

    if (token === "-I" || token === "--head" || token === "-L" || token === "--location" || token === "-s" || token === "--silent" || token === "-S" || token === "--show-error" || token === "-f" || token === "--fail" || token === "--fail-with-body" || token === "--compressed" || token === "-i" || token === "--include" || token === "-k" || token === "--insecure" || token === "--http1.1" || token === "--http2" || token === "-G" || token === "--get") {
      continue;
    }

    if (/^-[A-Za-z]{2,}$/.test(token)) {
      const shortFlags = token.slice(1).split("");
      if (shortFlags.every((flag) => "ILsSfkiG".includes(flag))) continue;
      return false;
    }

    if (token.startsWith("--request=")) {
      const method = token.slice("--request=".length).trim().toUpperCase();
      if (method !== "GET" && method !== "HEAD") return false;
      continue;
    }

    if (token === "-X" || token === "--request") {
      const nextIndex = consumeCurlFlagArg(tokens, i);
      if (nextIndex < 0) return false;
      const method = String(tokens[nextIndex] || "").trim().toUpperCase();
      if (method !== "GET" && method !== "HEAD") return false;
      i = nextIndex;
      continue;
    }

    if (token.startsWith("--url=")) {
      sawUrl = true;
      continue;
    }

    if (token === "--url") {
      const nextIndex = consumeCurlFlagArg(tokens, i);
      if (nextIndex < 0) return false;
      sawUrl = true;
      i = nextIndex;
      continue;
    }

    if (token.startsWith("--header=") || token.startsWith("--user-agent=") || token.startsWith("--user=") || token.startsWith("--connect-timeout=") || token.startsWith("--max-time=") || token.startsWith("--write-out=")) {
      continue;
    }

    if (token === "-H" || token === "--header" || token === "-A" || token === "--user-agent" || token === "-u" || token === "--user" || token === "--connect-timeout" || token === "-m" || token === "--max-time" || token === "-w" || token === "--write-out") {
      const nextIndex = consumeCurlFlagArg(tokens, i);
      if (nextIndex < 0) return false;
      i = nextIndex;
      continue;
    }

    if (
      token === "-d" || token === "--data" || token.startsWith("--data=") || token.startsWith("--data-") ||
      token === "-F" || token === "--form" || token.startsWith("--form=") ||
      token === "-T" || token === "--upload-file" || token.startsWith("--upload-file=") ||
      token === "-o" || token === "--output" || token.startsWith("--output=") ||
      token === "-O" || token === "--remote-name" || token === "--remote-name-all" ||
      token === "-K" || token === "--config" || token.startsWith("--config=") ||
      token === "--json" || token.startsWith("--json=") ||
      token === "--next"
    ) {
      return false;
    }

    return false;
  }

  return sawUrl;
}

function isAllowedPreApprovalSegment(segment) {
  const trimmed = String(segment || "").trim();
  if (!trimmed) return true;
  if (splitPipelineSegments(trimmed).length > 1) return isAllowedReadOnlyPipeline(trimmed);
  if (hasBlockedShellMeta(trimmed)) return false;

  const tokens = tokenizeShellWords(trimmed);
  if (!tokens || tokens.length === 0) return true;

  const [cmd] = tokens;

  if (cmd === "ls" || cmd === "rg" || cmd === "find" || cmd === "pwd" || cmd === "printf" || cmd === "echo" || cmd === "true" || cmd === "false") {
    return true;
  }

  if (cmd === "git") return isAllowedReadOnlyGitSegment(tokens);
  if (cmd === "curl") return isAllowedReadOnlyCurlSegment(tokens);

  return false;
}

function analyzeCommandSegments(command, classifier) {
  const trimmed = String(command || "").trim();
  if (!trimmed) return { segments: [], allowedSegments: [], blockedSegment: "" };

  const segments = splitCommandSegments(trimmed);
  const allowedSegments = [];
  let blockedSegment = "";

  for (const segment of segments) {
    if (classifier(segment)) {
      allowedSegments.push(segment);
      continue;
    }
    blockedSegment = segment;
    break;
  }

  return { segments, allowedSegments, blockedSegment };
}

function isAllowedPreApprovalBash(command) {
  const analysis = analyzeCommandSegments(command, isAllowedPreApprovalSegment);
  return !analysis.blockedSegment;
}

function isAllowedCloseoutGitSegment(tokens) {
  const [, subcmd, third] = tokens;
  if (isAllowedReadOnlyGitSegment(tokens)) return true;
  if (subcmd === "add" || subcmd === "commit" || subcmd === "push") return true;
  if (subcmd === "remote" && (third === "-v" || third === "show")) return true;
  return false;
}

function isAllowedCloseoutVerificationSegment(tokens) {
  const [cmd, subcmd, third] = tokens;
  const allowedTargets = new Set(["docs", "fmt", "format", "lint", "vet", "test", "build", "check", "verify"]);

  if (cmd === "make") {
    const targets = tokens.slice(1).filter((token) => token && !token.startsWith("-"));
    return targets.length > 0 && targets.every((target) => allowedTargets.has(target));
  }

  if (cmd === "go") return subcmd === "test" || subcmd === "vet" || subcmd === "fmt" || subcmd === "build";
  if (cmd === "gofmt") return true;
  if (cmd === "cargo") return subcmd === "test" || subcmd === "fmt" || subcmd === "clippy" || subcmd === "build";
  if (cmd === "pytest") return true;
  if (cmd === "python" && subcmd === "-m" && third === "pytest") return true;
  if (cmd === "uv" && subcmd === "run" && third === "pytest") return true;
  if ((cmd === "bash" || cmd === "sh") && String(subcmd || "").startsWith("tests/")) return true;

  if (cmd === "npm" || cmd === "pnpm" || cmd === "yarn" || cmd === "bun") {
    if (subcmd === "test") return true;
    if (subcmd === "run" || subcmd === "exec") {
      return tokens.some((token) => allowedTargets.has(token));
    }
  }

  return false;
}

function isAllowedCloseoutSegment(segment) {
  const trimmed = String(segment || "").trim();
  if (!trimmed) return true;
  if (hasBlockedShellMeta(trimmed)) return false;

  const tokens = tokenizeShellWords(trimmed);
  if (!tokens || tokens.length === 0) return true;

  const [cmd, subcmd] = tokens;
  if (isAllowedPreApprovalSegment(trimmed)) return true;
  if (cmd === "git") return isAllowedCloseoutGitSegment(tokens);
  if (isAllowedCloseoutVerificationSegment(tokens)) return true;
  if (cmd === "gh" && subcmd === "pr") return true;
  return false;
}

function isAllowedCloseoutBash(command) {
  const analysis = analyzeCommandSegments(command, isAllowedCloseoutSegment);
  return !analysis.blockedSegment;
}

function isAllowedCloseoutEditPath(pathValue) {
  const normalized = String(pathValue || "").trim();
  if (!normalized) return false;
  return normalized.endsWith(".md") || normalized.startsWith("docs/") || normalized.startsWith(".github/");
}

function isAllowedBranchBootstrapSegment(segment) {
  const trimmed = String(segment || "").trim();
  if (!trimmed) return true;
  if (hasBlockedShellMeta(trimmed)) return false;

  const tokens = tokenizeShellWords(trimmed);
  if (!tokens || tokens.length === 0) return true;

  const [cmd, subcmd, third, fourth] = tokens;
  if (cmd !== "git") return false;
  if (subcmd === "switch" && third === "-c" && Boolean(fourth)) return true;
  if (subcmd === "checkout" && third === "-b" && Boolean(fourth)) return true;
  if ((subcmd === "switch" || subcmd === "checkout") && Boolean(third) && !String(third).startsWith("-")) return true;
  return false;
}

function isAllowedBranchBootstrapBash(command) {
  const analysis = analyzeCommandSegments(command, isAllowedBranchBootstrapSegment);
  return !analysis.blockedSegment;
}

function suggestBranchNames() {
  return ["feat/<slug>", "fix/<slug>", "refactor/<slug>"];
}

function buildBranchPolicyBlockReason(branchName) {
  const branch = String(branchName || "main");
  return `Planforge branch policy blocked mutation on '${branch}'. Non-trivial implementation should move off trunk after approval. Create or switch to a task branch first (for example: ${suggestBranchNames().join(", ")}), then continue.`;
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
    scopeKind: normalizeScopeKind(state.scopeKind),
    scopeReason: String(state.scopeReason || "").trim(),
    closeoutDeclared: Boolean(state.closeoutDeclared),
    closeoutActive: Boolean(state.closeoutActive),
    closeoutOperations: Array.isArray(state.closeoutOperations)
      ? state.closeoutOperations.map((op) => String(op || "").trim()).filter(Boolean)
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
  const scopeDescriptor = gateState?.closeoutActive ? "closeout checkpoint" : "checkpoint";
  const scopeKind = normalizeScopeKind(gateState?.scopeKind) || "implementation";
  return `Continue with the approved ${scopeDescriptor}. Scope v${scope} is approved. Scope kind: ${scopeKind}. Review gates: ${summarizeReviewGates(gateState)}. Next review gate: ${nextReviewGateLabel(gateState)}. Execute only currently approved work and report evidence.`;
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

function buildBashBlockReason(gateState, command) {
  const scope = Math.max(1, gateState?.scopeVersion || 1);
  const analysis = analyzeCommandSegments(command, isAllowedPreApprovalSegment);
  const parts = [
    `Planforge gate is waiting approval for scope v${scope}. Blocked bash command before /pf because it is outside the read-only allowlist.`,
    "Allowed pre-approval commands: ls, rg, find, pwd, printf, echo, git status, git diff, git log, git remote -v, git branch --show-current, strict read-only curl GET/HEAD.",
  ];
  if (analysis.blockedSegment) parts.push(`Offending segment: \`${analysis.blockedSegment}\`.`);
  if (analysis.allowedSegments.length > 0) parts.push(`Safe split suggestion: run ${analysis.allowedSegments.map((segment) => `\`${segment}\``).join(" then ")} separately before /pf.`);
  parts.push(buildPreApprovalGateHint(gateState));
  return parts.join(" ");
}

function buildCloseoutBlockReason(state, detail) {
  const scope = Math.max(1, state?.scopeVersion || 1);
  return `Planforge closeout scope v${scope} only allows declared closeout work (docs/generated artifacts, mandated verification, commit, push, PR prep). ${detail} Re-plan and request /pf again before new implementation edits.`;
}

function isMinorCloseoutFollowup(text) {
  return CLOSEOUT_FOLLOWUP_HINT.test(String(text || ""));
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
    `Scope kind: ${normalizeScopeKind(state.scopeKind) || "none"}`,
    `Scope reason: ${state.scopeReason || "(not recorded)"}`,
    `Benchmark profile: ${state.benchmarkMode ? "on" : "off"}`,
    `Review gates proposed: ${state.reviewGatesProposed ? "yes" : "no"}`,
    `Review gates approved: ${state.reviewGatesApproved ? "yes" : "no"}`,
    `Scope version: v${Math.max(1, state.scopeVersion || 1)}`,
    `Scenario acceptance: ${normalizeAcceptanceState(state.acceptanceState)}`,
    `Closeout declared: ${state.closeoutDeclared ? "yes" : "no"}`,
    `Closeout active: ${state.closeoutActive ? "yes" : "no"}`,
    `Closeout ops: ${Array.isArray(state.closeoutOperations) && state.closeoutOperations.length > 0 ? state.closeoutOperations.join(", ") : "none parsed"}`,
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
    "Declared closeout lanes allow bounded docs/verification/commit/push/PR follow-up after final review.",
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

  function approveCurrentScope(ctx, reason, notify = true, overrides = {}) {
    const baseScope = Math.max(1, state.scopeVersion || 1);
    const scope = state.pendingScopeAdvance ? baseScope + 1 : baseScope;
    const nextState = {
      enabled: true,
      approved: true,
      scopeVersion: scope,
      acceptanceState: "accepted",
      pendingScopeAdvance: false,
      reviewGatesApproved: Boolean(state.reviewGatesProposed),
      currentReviewGateId: "",
      scopeKind: overrides.scopeKind || state.scopeKind || "implementation",
      scopeReason: overrides.scopeReason || state.scopeReason || "Approved current scope.",
      closeoutActive: Boolean(overrides.closeoutActive),
      closeoutDeclared: overrides.closeoutDeclared ?? state.closeoutDeclared,
      closeoutOperations: Array.isArray(overrides.closeoutOperations) ? overrides.closeoutOperations : state.closeoutOperations,
    };
    setState(
      nextState,
      reason,
      ctx,
      notify ? "success" : undefined,
      notify
        ? `Planforge gate approved for scope v${scope} (${nextState.scopeKind || "implementation"}). Review gates: ${summarizeReviewGates(state)}. Next review gate: ${nextReviewGateLabel(state)}.`
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
    const currentScope = Math.max(1, state.scopeVersion || 1);
    setState(
      {
        enabled: true,
        approved: false,
        scopeVersion: currentScope,
        acceptanceState: "none",
        pendingScopeAdvance: true,
        reviewGatesProposed: state.reviewGatesProposed,
        reviewGatesApproved: false,
        reviewGates: Array.isArray(state.reviewGates) ? state.reviewGates : [],
        reviewGateCursor: Number.isFinite(state.reviewGateCursor) ? state.reviewGateCursor : 0,
        currentReviewGateId: "",
        acceptedReviewGates: Array.isArray(state.acceptedReviewGates) ? state.acceptedReviewGates : [],
        scopeKind: "replan",
        scopeReason: message || "Scope changed and requires a revised plan.",
        closeoutDeclared: state.closeoutDeclared,
        closeoutActive: false,
        closeoutOperations: Array.isArray(state.closeoutOperations) ? state.closeoutOperations : [],
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
      state.closeoutDeclared
        ? "Scenario accepted. /pf can now approve the next implementation or declared closeout scope."
        : "Scenario accepted. Ask for the next checkpoint, then use /pf again to approve mutation."
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
          scopeKind: "implementation",
          scopeReason: "Awaiting first supervised approval.",
          closeoutActive: false,
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
        const enteringCloseout = !nextGate.gate && state.closeoutDeclared;
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
            scopeKind: enteringCloseout ? "closeout" : "implementation",
            scopeReason: enteringCloseout
              ? "Accepted final review gate; entered declared closeout scope."
              : `Accepted review gate${currentGateId ? ` ${currentGateId}` : ""}; next implementation scope approved.`,
            closeoutActive: enteringCloseout,
          },
          enteringCloseout ? "continue-closeout-scope" : "continue-next-review-gate",
          ctx,
          "success",
          enteringCloseout
            ? `Review accepted and closeout scope approved (v${nextScope}).`
            : `Review accepted and next scope approved (v${nextScope}).`
        );
      }
      return;
    }

    if (state.approved) {
      ctx.ui.notify(`Continue acknowledged (scope v${Math.max(1, state.scopeVersion || 1)}, ${state.scopeKind || "implementation"}).`, "info");
      return;
    }

    approveCurrentScope(ctx, "continue-command", true, {
      scopeKind: "implementation",
      scopeReason: state.scopeReason || "Approved implementation scope.",
      closeoutActive: false,
    });
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
          scopeKind: "none",
          scopeReason: "Fast mode active.",
          closeoutDeclared: false,
          closeoutActive: false,
          closeoutOperations: [],
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
          scopeKind: "implementation",
          scopeReason: "Awaiting supervised approval.",
          closeoutDeclared: false,
          closeoutActive: false,
          closeoutOperations: [],
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
          scopeKind: "none",
          scopeReason: "Investigation mode is read-only.",
          closeoutDeclared: false,
          closeoutActive: false,
          closeoutOperations: [],
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
          scopeKind: "implementation",
          scopeReason: "Awaiting supervised approval.",
          closeoutDeclared: false,
          closeoutActive: false,
          closeoutOperations: [],
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
    if ((acceptanceState === "awaiting" || acceptanceState === "revise_requested") && isNaturalAcceptance(text)) {
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
          closeoutDeclared: false,
          closeoutActive: false,
          closeoutOperations: [],
        },
        "review-gates-pushback",
        ctx,
        "info",
        "Review-gate pushback noted. Revise the plan's Proposed Review Gates section before approval."
      );
      return { action: "continue" };
    }

    if (state.approved && text && !TRIVIAL_ACK.test(text)) {
      if (state.closeoutActive && isMinorCloseoutFollowup(text)) {
        setState(
          {
            scopeKind: "closeout",
            scopeReason: `Closeout follow-up accepted: ${text}`,
          },
          "closeout-followup-allowed",
          ctx,
          "info",
          "Closeout follow-up accepted inside the approved closeout scope."
        );
      } else {
        invalidateForScopeChange(
          ctx,
          "user-followup-invalidated-approval",
          state.closeoutActive
            ? "Planforge gate: requested follow-up is outside the declared closeout scope. Re-plan + request explicit re-approval before mutation."
            : "Planforge gate: user follow-up invalidated prior approval. Re-plan + request explicit re-approval before mutation."
        );
      }
    }

    return { action: "continue" };
  });

  pi.on("message_end", async (event, ctx) => {
    const assistantText = extractAssistantText(event?.message);
    if (!assistantText) return;

    if (hasReviewGateProposal(assistantText)) {
      const parsedGates = parseReviewGates(assistantText);
      const closeout = parseCloseoutScope(assistantText);
      if (parsedGates.length > 0) {
        setState(
          {
            reviewGatesProposed: true,
            reviewGatesApproved: false,
            reviewGates: parsedGates,
            reviewGateCursor: 0,
            currentReviewGateId: "",
            acceptedReviewGates: [],
            closeoutDeclared: closeout.declared,
            closeoutActive: false,
            closeoutOperations: closeout.operations,
            scopeKind: "implementation",
            scopeReason: closeout.declared
              ? "Plan proposed with declared closeout scope."
              : "Plan proposed and awaiting approval.",
          },
          "review-gates-proposed",
          ctx,
          "info",
          `Review gates proposed in plan (${parsedGates.length}): ${parsedGates.map((gate) => gate.id).join(", ")}.${closeout.declared ? ` Closeout scope declared: ${closeout.operations.join(", ") || "none parsed"}.` : ""} User can push back before approving mutation.`
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
            scopeKind: "review",
            scopeReason: reachedGate
              ? `Review gate ${reachedGate.id} reached and awaiting acceptance.`
              : "Review packet reached and awaiting acceptance.",
            closeoutActive: false,
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

    const currentBranch = detectCurrentBranch();
    const branchNote = !state.closeoutActive && isTrunkLikeBranch(currentBranch)
      ? state.approved
        ? `Current branch is '${currentBranch}'. Before implementation edits, create or switch to a task branch.`
        : `Current branch is '${currentBranch}'. After scope approval and before implementation edits, create or switch to a task branch.`
      : "";

    const gateNote = state.approved
      ? state.closeoutActive
        ? `Current approved closeout scope (v${state.scopeVersion}) is active. Stay inside declared closeout work only: ${state.closeoutOperations.join(", ") || "docs/verification/commit/push/PR"}.`
        : `Current approved scope (v${state.scopeVersion}) is active. Mutating tools are allowed until the next review gate is reached.`
      : `Current mutating scope (v${Math.max(1, state.scopeVersion || 1)}) is NOT approved. Request /pf before calling mutating tools.`;

    const nextGate = resolveNextReviewGate(state).gate;
    const reviewGateSummary = Array.isArray(state.reviewGates) && state.reviewGates.length > 0
      ? `Review gates: ${state.reviewGates.map((g) => g.id).join(", ")}.`
      : "Review gates: none parsed yet.";

    const reviewGateNote = !state.reviewGatesProposed && !state.approved
      ? "Before requesting /pf for first mutation, include a '## Proposed Review Gates' section with Gate ID, Trigger, Required evidence, and Why this gate. Also extract repo obligations and declare a bounded '## Closeout Scope' when trailing work is predictable."
      : state.reviewGatesProposed && !state.reviewGatesApproved && !state.approved
        ? "Review gates are proposed but not yet approved. Ask the user to accept or adjust them before mutating work."
        : nextGate
          ? `Next review gate: ${nextGate.id}. When presenting the review packet for this gate, include line 'REVIEW_GATE_REACHED: ${nextGate.id}'.`
          : state.closeoutDeclared
            ? `No further review gates remain. If final acceptance is granted, the declared closeout lane may handle: ${state.closeoutOperations.join(", ") || "docs/verification/commit/push/PR"}.`
            : "";

    const closeoutNote = state.closeoutDeclared
      ? `Declared closeout lane: ${state.closeoutOperations.join(", ") || "docs/verification/commit/push/PR"}. New source edits invalidate it.`
      : "";

    return {
      systemPrompt: `${event.systemPrompt}\n\n[Planforge approval gate]\n${gateNote}${branchNote ? `\n${branchNote}` : ""}\n${acceptanceNote}\n${reviewGateSummary}\n${reviewGateNote}${closeoutNote ? `\n${closeoutNote}` : ""}\nIf scope changes or the user pushes back, re-post a revised plan summary + updated tests and request re-approval before mutating actions.${benchmarkNote ? `\n\n${benchmarkNote}` : ""}`,
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
      if (!state.closeoutActive) {
        const currentBranch = detectCurrentBranch();
        if (isTrunkLikeBranch(currentBranch)) {
          if (toolName === "bash" && isAllowedBranchBootstrapBash(bashCommand)) {
            return;
          }
          if (toolName === "edit" || toolName === "write" || (toolName === "bash" && isMutatingCall)) {
            const reason = buildBranchPolicyBlockReason(currentBranch);
            if (ctx?.hasUI) ctx.ui.notify(reason, "warning");
            return { block: true, reason };
          }
        }
      }

      if (state.closeoutActive) {
        if ((toolName === "edit" || toolName === "write") && !isAllowedCloseoutEditPath(event?.input?.path)) {
          const reason = buildCloseoutBlockReason(state, `Blocked ${toolName} on non-doc path '${String(event?.input?.path || "")}'.`);
          invalidateForScopeChange(ctx, "closeout-source-edit-blocked", reason);
          return { block: true, reason };
        }
        if (toolName === "bash" && !isAllowedCloseoutBash(bashCommand)) {
          const reason = buildCloseoutBlockReason(state, `Blocked bash segment outside closeout lane.`);
          invalidateForScopeChange(ctx, "closeout-bash-blocked", reason);
          return { block: true, reason };
        }
      }
      return;
    }

    if (toolName === "edit" || toolName === "write") {
      const reason = buildMutationBlockReason(state, toolName);
      if (ctx?.hasUI) ctx.ui.notify(reason, "warning");
      return { block: true, reason };
    }

    if (toolName === "bash" && !isAllowedPreApprovalBash(bashCommand)) {
      const reason = buildBashBlockReason(state, bashCommand);
      if (ctx?.hasUI) ctx.ui.notify(reason, "warning");
      return { block: true, reason };
    }
  });
}
