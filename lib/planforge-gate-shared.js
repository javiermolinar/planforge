const EXECUTION_MODES = new Set(["auto", "supervised", "fast", "none"]);
const ACCEPTANCE_STATES = new Set(["none", "awaiting", "accepted", "revise_requested"]);
const SCOPE_KINDS = new Set(["none", "implementation", "review", "closeout", "replan"]);

function normalizeExecutionMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return EXECUTION_MODES.has(normalized) ? normalized : "auto";
}

function normalizeAcceptanceState(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ACCEPTANCE_STATES.has(normalized) ? normalized : "none";
}

function normalizeScopeKind(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return SCOPE_KINDS.has(normalized) ? normalized : "none";
}

function scopeKindLabel(state) {
  const kind = normalizeScopeKind(state?.scopeKind);
  if (kind === "none") return "unspecified";
  return kind;
}

function resolveNextReviewGate(state) {
  const gates = Array.isArray(state?.reviewGates) ? state.reviewGates : [];
  const accepted = new Set(Array.isArray(state?.acceptedReviewGates) ? state.acceptedReviewGates : []);
  const start = Math.max(0, Number(state?.reviewGateCursor) || 0);

  for (let i = start; i < gates.length; i += 1) {
    if (!accepted.has(gates[i].id)) return gates[i];
  }
  for (let i = 0; i < start; i += 1) {
    if (!accepted.has(gates[i].id)) return gates[i];
  }
  return null;
}

function summarizeReviewGates(state) {
  const gates = Array.isArray(state?.reviewGates) ? state.reviewGates : [];
  if (gates.length === 0) return "none parsed";
  return gates.map((gate) => gate.id).join(", ");
}

function nextReviewGateLabel(state) {
  const nextGate = resolveNextReviewGate(state);
  return nextGate ? `${nextGate.id}${nextGate.trigger ? ` (${nextGate.trigger})` : ""}` : "none";
}

function isPlanforgeActive(state) {
  const mode = normalizeExecutionMode(state?.executionMode);
  return mode !== "auto" || Boolean(state?.enabled);
}

function gateStatusLine(state) {
  const mode = normalizeExecutionMode(state?.executionMode);
  const modeLabel = mode === "auto" ? "" : `, mode ${mode}`;
  const profileLabel = state?.benchmarkMode ? ", benchmark" : "";
  const gateCount = Array.isArray(state?.reviewGates) ? state.reviewGates.length : 0;
  const nextGate = resolveNextReviewGate(state);
  const reviewLabel = state?.reviewGatesProposed
    ? state?.reviewGatesApproved
      ? `, review-gates approved (${gateCount})`
      : `, review-gates proposed (${gateCount})`
    : ", review-gates missing";
  const reviewNextLabel = nextGate ? `, next ${nextGate.id}` : "";
  const acceptanceState = normalizeAcceptanceState(state?.acceptanceState);
  const scopeLabel = normalizeScopeKind(state?.scopeKind) !== "none" ? `, scope ${normalizeScopeKind(state?.scopeKind)}` : "";

  if (!isPlanforgeActive(state)) return "Planforge inactive";
  if (mode === "none") return `PF gate: investigate read-only${modeLabel}${profileLabel}${reviewLabel}${reviewNextLabel}`;
  if (mode === "fast") return `PF gate: fast mode active${modeLabel}${profileLabel}${reviewLabel}${reviewNextLabel}${scopeLabel}`;
  if (acceptanceState === "awaiting") {
    return `PF gate: awaiting scenario acceptance (scope v${Math.max(1, state?.scopeVersion || 1)}${modeLabel}${profileLabel}${reviewLabel}${reviewNextLabel}${scopeLabel})`;
  }
  if (acceptanceState === "revise_requested") {
    return `PF gate: revision requested (scope v${Math.max(1, state?.scopeVersion || 1)}${modeLabel}${profileLabel}${reviewLabel}${reviewNextLabel}${scopeLabel})`;
  }
  if (state?.approved) return `PF gate: approved (scope v${state.scopeVersion}${modeLabel}${profileLabel}${reviewLabel}${reviewNextLabel}${scopeLabel})`;
  return `PF gate: waiting approval (scope v${Math.max(1, state?.scopeVersion || 1)}${modeLabel}${profileLabel}${reviewLabel}${reviewNextLabel}${scopeLabel})`;
}

module.exports = {
  normalizeExecutionMode,
  normalizeAcceptanceState,
  normalizeScopeKind,
  scopeKindLabel,
  resolveNextReviewGate,
  summarizeReviewGates,
  nextReviewGateLabel,
  isPlanforgeActive,
  gateStatusLine,
};
