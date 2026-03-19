#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

node <<'NODE'
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(filePath) {
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
}

const agents = read('AGENTS.md');
const modesDoc = read('docs/modes.md');
const gateExtension = read('extensions/planforge-approval-gate.ts');

const match = agents.match(/<!-- MODE_CONTRACT:BEGIN -->[\s\S]*?```json\n([\s\S]*?)\n```[\s\S]*?<!-- MODE_CONTRACT:END -->/);
assert(match, 'AGENTS.md must include MODE_CONTRACT JSON block');

let contract;
try {
  contract = JSON.parse(match[1]);
} catch (error) {
  throw new Error(`AGENTS.md MODE_CONTRACT JSON is invalid: ${error.message}`);
}

assert(contract && Array.isArray(contract.modes), 'AGENTS.md MODE_CONTRACT must define modes[]');
assert(contract.modes.length >= 3, 'MODE_CONTRACT must contain at least 3 modes');

const expectedExecution = {
  planforge: 'supervised',
  'planforge-fast': 'fast',
  'forge-investigate': 'none',
};

for (const mode of contract.modes) {
  assert(mode.id && mode.startCommand && mode.skillFile && mode.executionMode, `Invalid mode entry: ${JSON.stringify(mode)}`);

  // docs/modes.md should reflect AGENTS mode contract
  const tableNeedle = `| \`${mode.id}\` | \`${mode.startCommand}\` | \`${mode.executionMode}\` |`;
  assert(
    modesDoc.includes(tableNeedle),
    `docs/modes.md missing or drifted row for ${mode.id}: expected fragment ${tableNeedle}`
  );

  const skill = read(mode.skillFile);

  if (mode.requiresPhilosophy) {
    assert(
      skill.includes('../../docs/philosophy.md'),
      `${mode.skillFile} must reference ../../docs/philosophy.md`
    );
  }

  if (mode.requiresPlanPacket) {
    assert(
      skill.includes('../../docs/plan-packet.md'),
      `${mode.skillFile} must reference ../../docs/plan-packet.md`
    );
  }

  if (mode.readOnlyUntilScopeApproval && mode.id !== 'forge-investigate') {
    assert(
      /Read-only actions only until explicit scope approval\./.test(skill),
      `${mode.skillFile} must enforce read-only until explicit scope approval`
    );
  }

  if (mode.id === 'forge-investigate') {
    assert(
      /read-only|non-mutating/i.test(skill),
      'skills/forge-investigate/SKILL.md must remain read-only/non-mutating'
    );
  }
}

// Hard guard: canonical mode->executionMode mapping in extension
assert(/PLANFORGE_SUPERVISED_SKILL_CMD/.test(gateExtension), 'approval gate missing supervised skill command matcher');
assert(/PLANFORGE_FAST_SKILL_CMD/.test(gateExtension), 'approval gate missing fast skill command matcher');
assert(/PLANFORGE_INVESTIGATE_SKILL_CMD/.test(gateExtension), 'approval gate missing investigate skill command matcher');

for (const [id, executionMode] of Object.entries(expectedExecution)) {
  const skillConst =
    id === 'planforge'
      ? 'PLANFORGE_SUPERVISED_SKILL_CMD'
      : id === 'planforge-fast'
        ? 'PLANFORGE_FAST_SKILL_CMD'
        : 'PLANFORGE_INVESTIGATE_SKILL_CMD';

  const mappingRegex = new RegExp(`${skillConst}[\\s\\S]*?executionMode: \"${executionMode}\"`);
  assert(mappingRegex.test(gateExtension), `approval gate mapping drift for ${id} -> ${executionMode}`);
}

console.log('mode contract integration test: PASS');
NODE
